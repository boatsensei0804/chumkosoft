const delivery = vi.hoisted(() => ({ enabled: vi.fn() }));
vi.mock("@/features/line/services/line-delivery-settings", () => ({ isLinePushEnabled: delivery.enabled }));
import { leaveCard } from "@/features/leave/leave-card";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { pushLineMessage, pushText, replyLineMessage, replyText, sendLineMessageToUsers, sendLineTextToUsers, verifyLineSignature } from "@/lib/line";
import { announcementCard } from "@/features/line/announcement-card";
import { teacherMenuSyncSignature, verifyTeacherMenuSync } from "@/features/line/teacher-menu-sync-auth";

describe("LINE message delivery", () => {
  beforeEach(() => {
    delivery.enabled.mockReset().mockResolvedValue(true);
    process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-token";
    process.env.LINE_CHANNEL_SECRET = "test-secret";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
    delete process.env.LINE_CHANNEL_SECRET;
  });

  it("pauses all quota-consuming sends before HTTP, but keeps parent quick replies available", async () => {
    delivery.enabled.mockResolvedValue(false);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    expect(await pushText("Uparent", "เข้าโรงเรียน")).toBe(false);
    expect(await pushLineMessage("Uparent", { type: "text", text: "อนุมัติลา" })).toBe(false);
    expect(await sendLineTextToUsers(["Uteacher"], "แจ้งครู", "key")).toEqual({ accepted: false, code: "SENDING_PAUSED", requestId: null, acceptedRequestId: null });
    expect(await sendLineMessageToUsers(["Ua", "Ub"], { type: "text", text: "ประกาศ" }, "key")).toEqual({ accepted: false, code: "SENDING_PAUSED", requestId: null, acceptedRequestId: null });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await replyText("reply", "ผูกบัญชีสำเร็จ")).toBe(true);
    expect(await replyLineMessage("reply", { type: "text", text: "เลือกวันลา" })).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [url] of fetchMock.mock.calls) expect(url).toContain("/reply");
  });
  it("checks the current switch for each send and resumes only when enabled", async () => {
    delivery.enabled.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 }); vi.stubGlobal("fetch", fetchMock);
    expect(await pushText("Uparent", "first")).toBe(false); expect(await pushText("Uparent", "second")).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).messages[0].text).toBe("second");
  });
  it("rejects an invalid webhook signature", () => {
    const body = JSON.stringify({ events: [] });
    const valid = createHmac("sha256", "test-secret").update(body).digest("base64");
    expect(verifyLineSignature(body, valid)).toBe(true);
    expect(verifyLineSignature(`${body} `, valid)).toBe(false);
    expect(verifyLineSignature(body, null)).toBe(false);
  });

  it("uses push for one advisor and treats an accepted retry as sent", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 409, headers: new Headers() });
    vi.stubGlobal("fetch", fetchMock);
    const result = await sendLineTextToUsers(["Uteacher"], "คำขอลา", "retry-key");
    expect(result).toEqual({ accepted: true, code: "HTTP_409", requestId: null, acceptedRequestId: null });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("/push");
    expect(options.headers["X-Line-Retry-Key"]).toBe("retry-key");
    expect(JSON.parse(options.body).to).toBe("Uteacher");
  });

  it("uses multicast for multiple advisors and reports an API failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429, headers: new Headers() });
    vi.stubGlobal("fetch", fetchMock);
    const result = await sendLineTextToUsers(["Ua", "Ub"], "คำขอลา", "retry-key");
    expect(result).toEqual({ accepted: false, code: "HTTP_429", requestId: null, acceptedRequestId: null });
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
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers() });
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
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers() });
    vi.stubGlobal("fetch", fetchMock);
    expect((await sendLineMessageToUsers(["Uparent"], card, "retry-card")).accepted).toBe(true);
    const [, options] = fetchMock.mock.calls[0];
    const payload = JSON.parse(options.body);
    expect(payload.messages[0].type).toBe("flex");
    expect(payload.messages[0].contents.header.backgroundColor).toBe("#B42332");
    expect(payload.messages[0].contents.header.contents[1].url).toBe("https://chumkosoft.com/mascot/error.png");
  });

  it("sends the card and image in one retryable request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers() });
    vi.stubGlobal("fetch", fetchMock);
    const messages = [announcementCard("NEWS", "หัวข้อ", "ข้อความ"), { type: "image" as const, originalContentUrl: "https://chumkosoft.com/image.jpg", previewImageUrl: "https://chumkosoft.com/preview.jpg" }];
    expect((await sendLineMessageToUsers(["Uexample"], messages, "stable-key")).accepted).toBe(true);
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.messages).toEqual(messages);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].headers["X-Line-Retry-Key"]).toBe("stable-key");
    expect((await sendLineMessageToUsers(["Uexample"], [], "empty")).accepted).toBe(false);
  });

  it("delivers leave Flex cards through reply and parent push without altering actions", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    const card = leaveCard("Review", "Child Two", [{ type: "postback", label: "Confirm", data: "leave|confirm|student2" }]);
    expect(await replyLineMessage("reply-token", card)).toBe(true);
    expect(await pushLineMessage("Uparent", card)).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ replyToken: "reply-token", messages: [card] });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ to: "Uparent", messages: [card] });
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
