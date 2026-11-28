import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import type { z } from "zod";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { admsKioskAccount, legacyAdmsDevice } from "@/features/faces/services/zkteco-devices";
import { getAdmsNetworks, normalizeAdmsIp, parseAdmsIpList } from "@/features/faces/services/zkteco-networks";
import { legacyScannerPinMap } from "@/features/faces/services/zkteco-pin-mapping";
import { scannerPinSchema } from "@/features/faces/zkteco-pin-mapping";
import type { AdmsUploadResult } from "@/features/faces/zkteco-upload-result";
import { processScannerBatch, scannerBatchSchema } from "@/features/faces/services/scanner-sync";

type AdmsTransport = "gateway" | "tunnel";
const maxBytes = 64 * 1024;
const batchSize = 20;
const uploadErrors = {
  invalid_row: "Invalid ATTLOG row",
  invalid_timestamp: "Invalid ATTLOG timestamp",
  ambiguous_pin: "Ambiguous attendance PIN",
  unmapped_pin: "Unmapped attendance PIN",
  attendance_rule: "Attendance record rejected by Chumkosoft",
} as const;
const timestampPattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/u;

function reply(body: string, status = 200): Response {
  return new Response(body, {
    status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function authorize(request: Request, transport: AdmsTransport): Promise<Response | undefined> {
  if (transport === "gateway") {
    const secret = process.env.ZKTECO_ADMS_SECRET;
    if (!secret || secret.length < 32) return reply("ADMS not configured", 503);
    const expected = Buffer.from(`Bearer ${secret}`);
    const supplied = Buffer.from(request.headers.get("authorization") ?? "");
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return reply("Unauthorized", 401);
    return;
  }

  const host = process.env.ZKTECO_ADMS_TUNNEL_HOST;
  if (!host || !/^scanner-[0-9a-f]{32}\.internal$/u.test(host)) {
    return reply("ADMS Tunnel not configured", 503);
  }

  // The dedicated Tunnel route overwrites Host before forwarding to the private origin.
  const expected = Buffer.from(host);
  const supplied = Buffer.from(request.headers.get("host") ?? "");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return reply("Forbidden ingress", 403);
  const ip = normalizeAdmsIp(request.headers.get("cf-connecting-ip") ?? "");
  if (!ip) return reply("School network not allowed", 403);

  try {
    const { allowedIps, revision } = await getAdmsNetworks();
    const addresses = revision === 0 ? parseAdmsIpList(allowedIps.join(",")) : allowedIps;
    if (!addresses || (revision === 0 && addresses.length === 0)) return reply("ADMS Tunnel not configured", 503);
    if (!addresses.includes(ip)) return reply("School network not allowed", 403);
  } catch {
    return reply("ADMS network settings unavailable", 503);
  }
}

async function configuredDevice(request: Request, params: URLSearchParams, transport: AdmsTransport) {
  const unauthorized = await authorize(request, transport);
  if (unauthorized) return unauthorized;
  const serial = params.get("SN");
  if (!serial || !/^[a-z0-9-]{1,64}$/iu.test(serial)) return reply("Unknown device", 403);

  const normalizedSerial = serial.toUpperCase();
  const legacy = legacyAdmsDevice();
  const device = await prisma.scannerDevice.findFirst({
    where: {
      OR: [
        { admsSerial: normalizedSerial },
        ...(legacy?.serial === normalizedSerial ? [{ id: legacy.id, admsSerial: null }] : []),
      ],
      kioskUser: admsKioskAccount,
    },
    select: { id: true, admsEnabled: true },
  });
  return device?.admsEnabled ? { id: device.id, serial } : reply("Unknown or disabled device", 403);
}

function logEventId(deviceId: string, pin: string, capturedAt: string, isExit: boolean): string {
  // Preserve existing check-in IDs for records replayed after an upgrade.
  const fields = ["zkteco-adms", deviceId, pin, capturedAt];
  if (isExit) fields.push("out");
  const bytes = createHash("sha256").update(JSON.stringify(fields)).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function findStudentCodesByPin(pins: string[]) {
  const candidates = pins.flatMap((pin) => {
    const codes = [pin];
    for (let position = 1; position < pin.length; position++) {
      codes.push(`${pin.slice(0, position)}-${pin.slice(position)}`);
    }
    return codes;
  });
  const students = candidates.length ? await prisma.student.findMany({
    where: { isDeleted: false, studentCode: { in: candidates } },
    select: { studentCode: true },
  }) : [];
  const codesByPin = new Map<string, string | null>();
  for (const { studentCode } of students) {
    const pin = studentCode.replace("-", "");
    codesByPin.set(pin, codesByPin.has(pin) ? null : studentCode);
  }
  return codesByPin;
}

async function readAttendanceBody(request: Request): Promise<string | Response> {
  const reader = request.body?.getReader();
  if (!reader) return reply("Missing attendance body", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return reply("Attendance payload too large", 413);
      }
      chunks.push(value);
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
  } catch {
    return reply("Invalid attendance body", 400);
  } finally {
    reader.releaseLock();
  }
}

export async function readAdms(request: Request, command: string, transport: AdmsTransport): Promise<Response> {
  if (command !== "cdata" && command !== "getrequest") return reply("Unknown ADMS command", 404);
  const query = new URL(request.url).searchParams;
  const device = await configuredDevice(request, query, transport);
  if (device instanceof Response) return device;
  await prisma.scannerDevice.updateMany({
    where: { id: device.id }, data: { admsLastSeenAt: new Date() },
  });
  if (command === "getrequest" || query.get("options") !== "all") return reply("OK");

  return reply([
    `GET OPTION FROM: ${device.serial}`,
    "ATTLOGStamp=0", "ErrorDelay=60", "Delay=30", "TransInterval=1",
    "TransFlag=TransData AttLog", "TimeZone=7", "Realtime=1", "",
  ].join("\r\n"));
}

export async function receiveAdms(request: Request, command: string, transport: AdmsTransport): Promise<Response> {
  if (command !== "cdata") return reply("Unknown ADMS command", 404);
  const query = new URL(request.url).searchParams;
  const device = await configuredDevice(request, query, transport);
  if (device instanceof Response) return device;
  const table = query.get("table");
  // Devices report their capabilities separately from attendance records.
  if (table === "options") return reply("OK");
  if (table !== "ATTLOG") return reply("Only attendance logs are supported", 415);
  if (!(await rateLimit(`zkteco-adms:${device.id}`, 15, 60)).ok) return reply("Too many requests", 429);

  const deviceId = device.id;
  let synced = false;
  async function finishUpload(response: Response, result: AdmsUploadResult): Promise<Response> {
    const now = new Date();
    await prisma.scannerDevice.updateMany({
      where: { id: deviceId },
      data: {
        admsLastSeenAt: now,
        admsLastUploadAt: now,
        admsLastUploadResult: result,
        ...(synced && { admsLastSyncAt: now }),
      },
    });
    return response;
  }

  try {
    const body = await readAttendanceBody(request);
    if (body instanceof Response) return await finishUpload(body, { outcome: "invalid_body" });
    const lines = body.split(/\r?\n/u).filter((line) => line.trim());
    if (!lines.length) return await finishUpload(reply("Missing attendance logs", 422), { outcome: "invalid_body" });

    let failure: keyof typeof uploadErrors | undefined;
    let skipped: AdmsUploadResult | undefined;
    const scans: { pin: string; localTime: string; isExit: boolean }[] = [];
    for (const line of lines) {
      const [rawPin, timestamp, status, verification] = line.split("\t");
      const pin = rawPin.replace(/^PIN=/u, "").trim();
      if (!scannerPinSchema.safeParse(pin).success || !timestampPattern.test(timestamp ?? "") || !/^\d+$/u.test(status ?? "") ||
          !/^\d+$/u.test(verification ?? "")) {
        failure ??= "invalid_row";
        continue;
      }
      const localTime = timestamp.replace(" ", "T");
      const calendar = new Date(`${localTime}Z`);
      if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 19) !== localTime) {
        failure ??= "invalid_timestamp";
        continue;
      }
      // PUSH SDK Appendix 7 reserves 15 for face and 0 for ambiguous automatic identification.
      if ((status !== "0" && status !== "1") || verification !== "15") {
        skipped ??= {
          outcome: "status_or_verification",
          status: status.length <= 3 ? Number(status) : null,
          verification: verification.length <= 3 ? Number(verification) : null,
        };
        continue;
      }
      scans.push({ pin, localTime, isExit: status === "1" });
    }
    const pins = [...new Set(scans.map(({ pin }) => pin))];
    const mappings = pins.length ? await prisma.scannerPinMapping.findMany({
      where: { deviceId: device.id, pin: { in: pins } },
      select: { pin: true, linkedAt: true, student: { select: { id: true, studentCode: true, isDeleted: true } } },
    }) : [];
    const mappingByPin = new Map(mappings.map((mapping) => [mapping.pin, mapping]));
    const legacy = legacyScannerPinMap(device.id);
    const studentCodesByPin = await findStudentCodesByPin(pins.filter((pin) => !mappingByPin.has(pin) && !legacy[pin]));
    const studentIds = new Map<string, string>();
    const events: z.infer<typeof scannerBatchSchema>["events"] = [];
    for (const { pin, localTime, isExit } of scans) {
      const mapping = mappingByPin.get(pin);
      const capturedAt = `${localTime}+07:00`;
      const eventId = logEventId(device.id, pin, capturedAt, isExit);
      const studentCode = mapping ? mapping.student?.studentCode : legacy[pin] ?? studentCodesByPin.get(pin);
      if (mapping && new Date(capturedAt) < mapping.linkedAt) {
        skipped ??= { outcome: "before_mapping" };
        continue;
      }
      if (!studentCode || mapping?.student?.isDeleted) {
        failure ??= studentCode === null ? "ambiguous_pin" : "unmapped_pin";
        continue;
      }
      if (mapping?.student) studentIds.set(eventId, mapping.student.id);
      events.push({ eventId, studentCode, capturedAt, localDate: localTime.slice(0, 10), ...(isExit && { direction: "out" }) });
    }
    for (let offset = 0; offset < events.length; offset += batchSize) {
      const result = await processScannerBatch(device.id, events.slice(offset, offset + batchSize), studentIds);
      if (result.accepted.length) synced = true;
      if (result.rejected.length) failure ??= "attendance_rule";
    }
    if (failure) return await finishUpload(reply(uploadErrors[failure], 422), { outcome: failure });
    const result: AdmsUploadResult = synced ? { outcome: "synced" } : (skipped ?? { outcome: "invalid_body" });
    return await finishUpload(reply(`OK: ${lines.length}`), result);
  } catch {
    const response = reply("Attendance service unavailable", 503);
    return finishUpload(response, { outcome: "unavailable" }).catch(() => response);
  }
}
