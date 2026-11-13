import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { pushText, replyLineMessage, replyText, sendLineMessageToUsers, sendLineTextToUsers, verifyLineSignature } from "@/lib/line";
import { announcementCard } from "@/features/line/announcement-card";
import { teacherMenuSyncSignature, verifyTeacherMenuSync } from "@/features/line/teacher-menu-sync-auth";

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

  it("sends a tappable leave choice as a LINE quick reply", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    const sent = await replyLineMessage("reply-token", { type: "text", text: "เลือกประเภท", quickReply: { items: [
      { type: "action", action: { type: "postback", label: "ลาป่วย", data: "leave|kind|student|SICK" } },
    ] } });
    expect(sent).toBe(true);
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.messages[0].quickReply.items[0].action.data).toBe("leave|kind|student|SICK");
  });

  it("sends a complete long announcement as one Flex card", async () => {
    const body = "ประกาศจากโรงเรียน".repeat(190);
    const card = announcementCard("EMERGENCY", "แจ้งเปลี่ยนเวลาเลิกเรียน", body);
    expect(card.altText.length).toBeLessThanOrEqual(400);
    expect(card.contents.body.contents.filter((item) => item.type === "text").slice(1).map((item) => "text" in item ? item.text : "").join("")).toBe(body);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    expect((await sendLineMessageToUsers(["Uparent"], card, "retry-card")).accepted).toBe(true);
    const [, options] = fetchMock.mock.calls[0];
    const payload = JSON.parse(options.body);
    expect(payload.messages[0].type).toBe("flex");
    expect(payload.messages[0].contents.header.backgroundColor).toBe("#B42332");
  });

  it("authenticates teacher menu sync only within five minutes", () => {
    const now = 1_700_000_000_000;
    const timestamp = Math.floor(now / 1000);
    const signature = teacherMenuSyncSignature("test-token", timestamp);
    expect(verifyTeacherMenuSync("test-token", String(timestamp), signature, now)).toBe(true);
    expect(verifyTeacherMenuSync("wrong-token", String(timestamp), signature, now)).toBe(false);
    expect(verifyTeacherMenuSync("test-token", String(timestamp - 301), signature, now)).toBe(false);
  });
});
