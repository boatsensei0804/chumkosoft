import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { pushText, replyText, sendLineTextToUsers, verifyLineSignature } from "@/lib/line";

describe("LINE message delivery", () => {
  beforeEach(() => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-token";
    process.env.LINE_CHANNEL_SECRET = "test-secret";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
    delete process.env.LINE_CHANNEL_SECRET;
  });

  it("rejects an invalid webhook signature", () => {
    const body = JSON.stringify({ events: [] });
    const valid = createHmac("sha256", "test-secret").update(body).digest("base64");
    expect(verifyLineSignature(body, valid)).toBe(true);
    expect(verifyLineSignature(`${body} `, valid)).toBe(false);
    expect(verifyLineSignature(body, null)).toBe(false);
  });

  it("uses push for one advisor and treats an accepted retry as sent", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 409 });
    vi.stubGlobal("fetch", fetchMock);
    const result = await sendLineTextToUsers(["Uteacher"], "คำขอลา", "retry-key");
    expect(result).toEqual({ accepted: true, code: "HTTP_409" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("/push");
    expect(options.headers["X-Line-Retry-Key"]).toBe("retry-key");
    expect(JSON.parse(options.body).to).toBe("Uteacher");
  });

  it("uses multicast for multiple advisors and reports an API failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    vi.stubGlobal("fetch", fetchMock);
    const result = await sendLineTextToUsers(["Ua", "Ub"], "คำขอลา", "retry-key");
    expect(result).toEqual({ accepted: false, code: "HTTP_429" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("/multicast");
    expect(JSON.parse(options.body).to).toEqual(["Ua", "Ub"]);
  });

  it("reports parent push and reply failures without claiming delivery", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    expect(await pushText("Uparent", "ผลคำขอ")).toBe(false);
    expect(await replyText("reply-token", "รับคำขอแล้ว")).toBe(false);
  });
});
