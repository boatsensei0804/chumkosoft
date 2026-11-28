import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/internal/zkteco-adms/[command]/route";
import { GET as scannerGet, POST as scannerPost } from "@/app/iclock/[command]/route";

const { device, batch, recordedScans, students, updateDevice, networks } = vi.hoisted(() => ({ device: vi.fn(), batch: vi.fn(), recordedScans: vi.fn(), students: vi.fn(), updateDevice: vi.fn(), networks: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  default: { scannerDevice: { findFirst: device, updateMany: updateDevice }, scannerSyncEvent: { findMany: recordedScans }, student: { findMany: students }, zktecoNetworkSetting: { findUnique: networks } },
}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => ({ ok: true }) }));
vi.mock("@/features/faces/services/scanner-sync", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/features/faces/services/scanner-sync")>(), processScannerBatch: batch,
}));

const secret = "a-test-secret-with-at-least-32-characters";
const deviceId = "1fcadb26-361f-4c77-9dde-759cb13d861f";
const context = { params: Promise.resolve({ command: "cdata" }) };

function configure() {
  vi.stubEnv("ZKTECO_ADMS_SECRET", secret);
  vi.stubEnv("ZKTECO_ADMS_SERIAL", "MB10TEST");
  vi.stubEnv("ZKTECO_ADMS_DEVICE_ID", deviceId);
  recordedScans.mockResolvedValue([]);
  students.mockImplementation(async ({ where }) => where.studentCode.in.includes("001") ? [{ studentCode: "001" }] : []);
  networks.mockResolvedValue(null);
  device.mockImplementation(async ({ where }) => where.OR.some((condition: { admsSerial?: string }) => condition.admsSerial === "MB10TEST")
    ? { id: deviceId, admsEnabled: true }
    : null);
  batch.mockImplementation(async (_id, events: { eventId: string }[]) => ({
    accepted: events.map(({ eventId }) => eventId), rejected: [],
  }));
}

function request(query: string, body?: string, authorization = secret) {
  return new Request(`http://localhost/api/internal/zkteco-adms/cdata?${query}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { authorization: `Bearer ${authorization}` },
    body,
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe("ZKTeco ADMS receiver", () => {
  it("rejects a missing credential and a different device serial", async () => {
    configure();
    expect((await GET(request("SN=MB10TEST&options=all", undefined, "wrong"), context)).status).toBe(401);
    expect((await GET(request("SN=OTHER&options=all"), context)).status).toBe(403);
    expect(device).toHaveBeenCalledTimes(1);
  });

  it("requests attendance logs only during setup", async () => {
    configure();
    const result = await GET(request("SN=MB10TEST&options=all"), context);
    expect(result.status).toBe(200);
    expect(await result.text()).toContain("TransFlag=TransData AttLog\r\n");
  });

  it("uses a registered serial without per-device environment settings and marks a real heartbeat", async () => {
    configure();
    vi.stubEnv("ZKTECO_ADMS_SERIAL", "");
    vi.stubEnv("ZKTECO_ADMS_DEVICE_ID", "");
    const result = await GET(request("SN=MB10TEST&options=all"), context);
    expect(result.status).toBe(200);
    expect(device).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ OR: [{ admsSerial: "MB10TEST" }] }),
    }));
    expect(updateDevice).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: deviceId }, data: { admsLastSeenAt: expect.any(Date) },
    }));
  });

  it("blocks an explicitly disabled registered device", async () => {
    configure();
    device.mockResolvedValue({ id: deviceId, admsEnabled: false });
    expect((await GET(request("SN=MB10TEST&options=all"), context)).status).toBe(403);
    expect(updateDevice).not.toHaveBeenCalled();
  });

  it("maps a face check-in and produces the same event ID on a device retry", async () => {
    configure();
    const body = "001\t2026-11-27 08:01:59\t0\t15\t0\r\n001\t2026-11-27 09:01:59\t0\t1\t0";
    const query = "SN=MB10TEST&table=ATTLOG";
    expect(await (await POST(request(query, body), context)).text()).toBe("OK: 2");
    await POST(request(query, body), context);
    expect(batch.mock.calls[0]).toEqual(batch.mock.calls[1]);
    expect(batch.mock.calls[0]).toEqual([deviceId, [{
      eventId: expect.any(String), studentCode: "001", capturedAt: "2026-11-27T08:01:59+07:00",
      localDate: "2026-11-27",
    }]]);
  });

  it("resolves numeric IDs against student codes with or without a dash", async () => {
    configure();
    students.mockResolvedValue([{ studentCode: "68-0421" }, { studentCode: "00422" }]);
    const query = "SN=MB10TEST&table=ATTLOG";
    const body = "680421\t2026-11-27 08:01:59\t0\t15\n00422\t2026-11-27 08:02:00\t0\t15";
    expect(await (await POST(request(query, body), context)).text()).toBe("OK: 2");
    expect(students).toHaveBeenCalledWith({
      where: { isDeleted: false, studentCode: { in: expect.arrayContaining(["68-0421", "00422"]) } },
      select: { studentCode: true },
    });
    expect(batch.mock.calls[0][1].map((event: { studentCode: string }) => event.studentCode)).toEqual(["68-0421", "00422"]);
  });

  it("rejects a numeric ID when multiple student codes resolve to it", async () => {
    configure();
    students.mockResolvedValue([{ studentCode: "68-0421" }, { studentCode: "680421" }]);
    const result = await POST(request("SN=MB10TEST&table=ATTLOG", "680421\t2026-11-27 08:01:59\t0\t15"), context);
    expect(result.status).toBe(422);
    expect(await result.text()).toBe("Ambiguous attendance PIN");
    expect(batch).not.toHaveBeenCalled();
  });

  it("uses the current student code even when an old environment mapping exists", async () => {
    configure();
    vi.stubEnv("ZKTECO_ADMS_PIN_MAP", '{"001":"LEGACY-CODE"}');
    const result = await POST(request("SN=MB10TEST&table=ATTLOG", "001\t2026-11-27 08:01:59\t0\t15"), context);
    expect(await result.text()).toBe("OK: 1");
    expect(batch).toHaveBeenCalledWith(deviceId, [expect.objectContaining({ studentCode: "001" })]);
  });

  it("acknowledges an already recorded device event after a student code changes", async () => {
    configure();
    const query = "SN=MB10TEST&table=ATTLOG";
    const body = "001\t2026-11-27 08:01:59\t0\t15";
    expect((await POST(request(query, body), context)).status).toBe(200);
    const [{ eventId }] = batch.mock.calls[0][1];
    recordedScans.mockResolvedValue([{ eventId }]);
    students.mockResolvedValue([]);
    batch.mockClear();

    expect(await (await POST(request(query, body), context)).text()).toBe("OK: 1");
    expect(batch).not.toHaveBeenCalled();
    expect(recordedScans).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ deviceId, eventId: { in: [eventId] } }),
    }));
  });

  it("does not acknowledge an unmapped PIN, malformed timestamp, or failed downstream processing", async () => {
    configure();
    const query = "SN=MB10TEST&table=ATTLOG";
    expect((await POST(request(query, "009\t2026-11-27 08:01:59\t0\t15"), context)).status).toBe(422);
    expect((await POST(request(query, "001\t2026-02-30 08:01:59\t0\t15"), context)).status).toBe(422);
    expect(batch).not.toHaveBeenCalled();
    batch.mockResolvedValue({ accepted: [], rejected: [{ reason: "Rejected by attendance rules" }] });
    expect((await POST(request(query, "001\t2026-11-27 08:01:59\t0\t15"), context)).status).toBe(422);
  });

  it("processes a mapped face check-in even if another row has an unmapped PIN", async () => {
    configure();
    const body = "009\t2026-11-27 08:01:59\t0\t15\n001\t2026-11-27 08:02:00\t0\t15";
    const response = await POST(request("SN=MB10TEST&table=ATTLOG", body), context);
    expect(response.status).toBe(422);
    expect(batch).toHaveBeenCalledWith(deviceId, [
      expect.objectContaining({ studentCode: "001", capturedAt: "2026-11-27T08:02:00+07:00" }),
    ]);
    expect(updateDevice).toHaveBeenCalledWith({
      where: { id: deviceId },
      data: {
        admsLastSeenAt: expect.any(Date),
        admsLastSyncAt: expect.any(Date),
        admsLastUploadAt: expect.any(Date),
        admsLastUploadResult: { outcome: "unmapped_pin" },
      },
    });
  });

  it("processes a mapped face check-in even if a different ATTLOG row is malformed", async () => {
    configure();
    const body = "bad row\n001\t2026-11-27 08:02:00\t0\t15";
    const response = await POST(request("SN=MB10TEST&table=ATTLOG", body), context);
    expect(response.status).toBe(422);
    expect(batch).toHaveBeenCalledWith(deviceId, [
      expect.objectContaining({ studentCode: "001" }),
    ]);
  });

  it("forwards a face checkout as an outbound scan, separately from check-in", async () => {
    configure();
    const body = ["001\t2026-11-27 08:00:00\t0\t15", "001\t2026-11-27 08:00:00\t1\t15"].join("\n");
    const response = await POST(request("SN=MB10TEST&table=ATTLOG", body), context);
    expect(await response.text()).toBe("OK: 2");
    const [arrival, departure] = batch.mock.calls[0][1];
    expect(arrival.direction).toBeUndefined();
    expect(departure.direction).toBe("out");
    expect(departure.eventId).not.toBe(arrival.eventId);
  });

  it("records an ignored upload separately from a successful sync without retaining the PIN", async () => {
    configure();
    const body = "001\t2026-11-27 08:01:59\t0\t0";
    const response = await POST(request("SN=MB10TEST&table=ATTLOG", body), context);
    expect(await response.text()).toBe("OK: 1");
    expect(batch).not.toHaveBeenCalled();
    expect(updateDevice).toHaveBeenCalledWith({
      where: { id: deviceId },
      data: {
        admsLastSeenAt: expect.any(Date),
        admsLastUploadAt: expect.any(Date),
        admsLastUploadResult: { outcome: "status_or_verification", status: 0, verification: 0 },
      },
    });
  });

  it("continues processing later scanner batches after a downstream attendance rejection", async () => {
    configure();
    batch.mockResolvedValueOnce({ accepted: [], rejected: [{ reason: "Attendance rule" }] });
    const body = Array.from({ length: 21 }, (_, index) =>
      "001\t2026-11-27 08:01:" + String(index).padStart(2, "0") + "\t0\t15",
    ).join("\n");
    const response = await POST(request("SN=MB10TEST&table=ATTLOG", body), context);
    expect(response.status).toBe(422);
    expect(batch).toHaveBeenCalledTimes(2);
    expect(updateDevice).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ admsLastSyncAt: expect.any(Date), admsLastUploadResult: { outcome: "attendance_rule" } }),
    }));
  });

  it("accepts a Tunnel heartbeat and writes attendance through the server API without a Worker", async () => {
    configure();
    vi.stubEnv("ZKTECO_ADMS_TUNNEL_HOST", "scanner-0123456789abcdef0123456789abcdef.internal");
    vi.stubEnv("ZKTECO_ADMS_ALLOWED_IPS", "198.51.100.42");
    const headers = { Host: "scanner-0123456789abcdef0123456789abcdef.internal", "CF-Connecting-IP": "198.51.100.42" };
    const heartbeat = await scannerGet(new Request("http://localhost/iclock/getrequest.aspx?SN=MB10TEST", { headers }), {
      params: Promise.resolve({ command: "getrequest.aspx" }),
    });
    expect(await heartbeat.text()).toBe("OK");
    const body = "001\t2026-11-27 08:01:59\t0\t15";
    const result = await scannerPost(new Request("http://localhost/iclock/cdata?SN=MB10TEST&table=ATTLOG", {
      method: "POST", body, headers,
    }), context);
    expect(result.status).toBe(200);
    expect(await result.text()).toBe("OK: 1");
    expect(batch.mock.calls[0][1][0].studentCode).toBe("001");
  });

  it("uses web-managed IPs immediately and stops accepting IPs removed from the list", async () => {
    configure();
    const tunnel = "scanner-0123456789abcdef0123456789abcdef.internal";
    vi.stubEnv("ZKTECO_ADMS_TUNNEL_HOST", tunnel);
    vi.stubEnv("ZKTECO_ADMS_ALLOWED_IPS", "198.51.100.42");
    const heartbeat = (ip: string) => scannerGet(new Request("http://localhost/iclock/cdata?SN=MB10TEST", {
      headers: { Host: tunnel, "CF-Connecting-IP": ip },
    }), context);
    expect((await heartbeat("198.51.100.42")).status).toBe(200);
    networks.mockResolvedValue({ allowedIps: ["198.51.100.43", "2001:db8::10"], revision: 1 });
    expect(await (await heartbeat("198.51.100.42")).text()).toBe("School network not allowed");
    expect((await heartbeat("198.51.100.43")).status).toBe(200);
    expect((await heartbeat("2001:0db8:0:0:0:0:0:0010")).status).toBe(200);
    networks.mockResolvedValue({ allowedIps: [], revision: 2 });
    expect((await heartbeat("198.51.100.42")).status).toBe(403);
    expect((await heartbeat("198.51.100.43")).status).toBe(403);
  });

  it("acknowledges a registered device's configuration without recording attendance", async () => {
    configure();
    const tunnel = "scanner-0123456789abcdef0123456789abcdef.internal";
    vi.stubEnv("ZKTECO_ADMS_TUNNEL_HOST", tunnel);
    vi.stubEnv("ZKTECO_ADMS_ALLOWED_IPS", "198.51.100.42");
    const options = (serial: string, ip: string) => scannerPost(new Request(
      `http://localhost/iclock/cdata?SN=${serial}&table=options`,
      { method: "POST", body: "FingerFunOn=1,FaceFunOn=1", headers: { Host: tunnel, "CF-Connecting-IP": ip } },
    ), context);

    expect((await options("MB10TEST", "198.51.100.43")).status).toBe(403);
    expect((await options("OTHER", "198.51.100.42")).status).toBe(403);
    const response = await options("MB10TEST", "198.51.100.42");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
    expect(updateDevice).not.toHaveBeenCalled();
    expect(batch).not.toHaveBeenCalled();
  });

  it("fails closed when database network settings cannot be read", async () => {
    configure();
    const tunnel = "scanner-0123456789abcdef0123456789abcdef.internal";
    vi.stubEnv("ZKTECO_ADMS_TUNNEL_HOST", tunnel);
    vi.stubEnv("ZKTECO_ADMS_ALLOWED_IPS", "198.51.100.42");
    networks.mockRejectedValue(new Error("database unavailable"));
    const response = await scannerGet(new Request("http://localhost/iclock/cdata?SN=MB10TEST", {
      headers: { Host: tunnel, "CF-Connecting-IP": "198.51.100.42" },
    }), context);
    expect(response.status).toBe(503);
    expect(device).not.toHaveBeenCalled();
  });

  it("blocks requests that lack the Tunnel host or allowed IP before looking up any device", async () => {
    configure();
    const tunnel = "scanner-0123456789abcdef0123456789abcdef.internal";
    vi.stubEnv("ZKTECO_ADMS_TUNNEL_HOST", tunnel);
    vi.stubEnv("ZKTECO_ADMS_ALLOWED_IPS", "198.51.100.42");
    const headers: HeadersInit[] = [
      { Host: "scanner.chumkosoft.com", "X-Forwarded-Host": tunnel, "CF-Connecting-IP": "198.51.100.42" },
      { Host: tunnel, "CF-Connecting-IP": "198.51.100.43", "X-Forwarded-For": "198.51.100.42" },
      { Host: tunnel, "X-Forwarded-For": "198.51.100.42" },
    ];
    for (const spoofed of headers) {
      const result = await scannerGet(new Request("http://localhost/iclock/cdata?SN=MB10TEST", { headers: spoofed }), context);
      expect(result.status).toBe(403);
    }
    expect(networks).toHaveBeenCalledTimes(1);
    expect(device).not.toHaveBeenCalled();
  });

  it("does not accept face templates or oversized attendance requests", async () => {
    configure();
    expect((await POST(request("SN=MB10TEST&table=BIODATA", "unused"), context)).status).toBe(415);
    expect((await POST(request("SN=MB10TEST&table=ATTLOG", "a".repeat(70_000)), context)).status).toBe(413);
    expect(batch).not.toHaveBeenCalled();
  });
});
