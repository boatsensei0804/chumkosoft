import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(), create: vi.fn(), findFirst: vi.fn(), batches: vi.fn(), updateBatch: vi.fn(),
  enabled: vi.fn(), configured: vi.fn(), send: vi.fn(), audit: vi.fn(), put: vi.fn(), remove: vi.fn(), read: vi.fn(), prepare: vi.fn(), audience: vi.fn(), fingerprint: vi.fn(),
}));
vi.mock("@/features/line/services/line-delivery-settings", () => ({ isLinePushEnabled: mocks.enabled }));
vi.mock("@/lib/prisma", () => ({ default: { lineAnnouncement: { findUnique: mocks.findUnique, findFirst: mocks.findFirst, create: mocks.create }, lineAnnouncementBatch: { findMany: mocks.batches, update: mocks.updateBatch } } }));
vi.mock("@/lib/line", () => ({ isLineConfigured: mocks.configured, sendLineMessageToUsers: mocks.send }));
vi.mock("@/lib/minio", () => ({ putObject: mocks.put, removeObject: mocks.remove, getObjectBytes: mocks.read }));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.audit }));
vi.mock("@/features/line/services/announcement-image-service", () => ({ prepareAnnouncementImage: mocks.prepare }));
vi.mock("@/features/line/services/announcement-audience-service", () => ({ resolveAnnouncementAudience: mocks.audience, recipientFingerprint: mocks.fingerprint }));
import { createAndSendLineAnnouncement, deliverLineAnnouncement, type AnnouncementInput } from "@/features/line/services/line-announcements";
import { GET } from "@/app/api/line/announcement-images/[id]/route";
const imageId = "00000000-0000-4000-8000-000000000001";
const input: AnnouncementInput = { requestKey: imageId, kind: "NEWS", title: "ประกาศทดสอบ", body: "ข้อความตัวอย่าง", expectedRecipients: 1, expectedRecipientFingerprint: "recipient-fingerprint", audience: { mode: "all" } };
beforeEach(() => {
  vi.resetAllMocks(); mocks.enabled.mockResolvedValue(true); mocks.configured.mockReturnValue(true); mocks.fingerprint.mockReturnValue("recipient-fingerprint");
  mocks.audience.mockResolvedValue({ recipients: ["Uexample"], fingerprint: "recipient-fingerprint" });
  mocks.prepare.mockResolvedValue({ original: Buffer.from("original"), preview: Buffer.from("preview"), digest: "digest" });
  mocks.send.mockResolvedValue({ accepted: true }); mocks.batches.mockResolvedValue([{ status: "ACCEPTED", recipientCount: 1 }]);
});
describe("announcement attachment delivery", () => {
  it("does not create, upload, or retry announcements while paused", async () => {
    mocks.enabled.mockResolvedValue(false);
    expect((await createAndSendLineAnnouncement(input, "admin")).message).toContain("พักการส่ง");
    expect((await deliverLineAnnouncement("announcement", "admin")).message).toContain("พักการส่ง");
    for (const fn of [mocks.create, mocks.prepare, mocks.put, mocks.send, mocks.updateBatch]) expect(fn).not.toHaveBeenCalled();
  });
  it("leaves a batch unsent when paused during delivery without marking it accepted or failed", async () => {
    mocks.findUnique.mockResolvedValueOnce({ ...input, id: "announcement", imageId, isDeleted: false, recipientCount: 1, batches: [{ id: "pending", status: "PENDING", recipients: ["Uexample"], retryKey: "stable" }] }).mockResolvedValue({ isDeleted: false });
    mocks.send.mockResolvedValue({ accepted: false, code: "SENDING_PAUSED" });
    mocks.batches.mockResolvedValue([{ status: "PENDING", recipientCount: 1 }]);
    const result = await deliverLineAnnouncement("announcement", "admin");
    expect(result).toMatchObject({ ok: false, accepted: 0, remaining: 1 }); expect(result.message).toContain("พักการส่ง");
    expect(mocks.updateBatch).not.toHaveBeenCalled();
  });
  it("retries only unsent batches with the same image and retry key, without uploading again", async () => {
    mocks.findUnique.mockResolvedValueOnce({ ...input, id: "announcement", imageId, isDeleted: false, recipientCount: 1, batches: [
      { id: "already", status: "ACCEPTED", recipients: ["Uprior"], retryKey: "prior" },
      { id: "pending", status: "FAILED", recipients: ["Uexample"], retryKey: "stable-retry" },
    ] }).mockResolvedValue({ isDeleted: false });
    expect((await deliverLineAnnouncement("announcement", "admin")).ok).toBe(true);
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith(["Uexample"], [expect.objectContaining({ type: "flex" }), expect.objectContaining({ type: "image", originalContentUrl: `https://chumkosoft.com/api/line/announcement-images/${imageId}` })], "stable-retry");
    expect(mocks.put).not.toHaveBeenCalled();
  });
  it("does not create or send an announcement when image upload fails", async () => {
    mocks.findUnique.mockResolvedValue(null); mocks.put.mockResolvedValueOnce("key").mockRejectedValueOnce(new Error("Storage unavailable"));
    const result = await createAndSendLineAnnouncement(input, "admin", new File(["test"], "picture.jpg", { type: "image/jpeg" }));
    expect(result.ok).toBe(false); expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.remove).toHaveBeenCalledTimes(2);
  });
  it("keeps text-only announcements compatible without touching object storage", async () => {
    mocks.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "created", kind: "NEWS", title: input.title, body: input.body, imageId: null, isDeleted: false, recipientCount: 1, batches: [{ id: "batch", status: "PENDING", recipients: ["Uexample"], retryKey: "key" }] }).mockResolvedValue({ isDeleted: false });
    mocks.create.mockResolvedValue({ id: "created" });
    expect((await createAndSendLineAnnouncement(input, "admin")).ok).toBe(true);
    expect(mocks.put).not.toHaveBeenCalled(); expect(mocks.prepare).not.toHaveBeenCalled();
    expect(mocks.send).toHaveBeenCalledWith(["Uexample"], expect.objectContaining({ type: "flex" }), "key");
  });
  it("persists the image snapshot before sending, so retry can use the same media", async () => {
    mocks.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "created", kind: "NEWS", title: input.title, body: input.body, imageId, isDeleted: false, recipientCount: 1, batches: [{ id: "batch", status: "PENDING", recipients: ["Uexample"], retryKey: "key" }] }).mockResolvedValue({ isDeleted: false });
    mocks.create.mockResolvedValue({ id: "created" });
    expect((await createAndSendLineAnnouncement(input, "admin", new File(["test"], "picture.jpg", { type: "image/jpeg" }))).ok).toBe(true);
    expect(mocks.put).toHaveBeenCalledTimes(2);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ imageId: expect.any(String), imageKey: expect.stringMatching(/^announcements\//), imagePreviewKey: expect.stringMatching(/preview\.jpg$/), imageSha256: "digest" }) }));
    expect(mocks.create.mock.invocationCallOrder[0]).toBeLessThan(mocks.send.mock.invocationCallOrder[0]);
  });
  it("refuses changing the image on a previously accepted request key", async () => {
    mocks.findUnique.mockResolvedValue({ ...input, imageSha256: "prior-digest", isDeleted: false, batches: [{ recipients: ["Uexample"] }] });
    expect((await createAndSendLineAnnouncement(input, "admin", new File(["new"], "new.jpg", { type: "image/jpeg" }))).ok).toBe(false);
    expect(mocks.put).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
  });
});
describe("LINE image fetch endpoint", () => {
  it("rejects arbitrary identifiers without accessing storage", async () => {
    const response = await GET(new Request("https://chumkosoft.com/api/line/announcement-images/bad"), { params: Promise.resolve({ id: "bad" }) });
    expect(response.status).toBe(404); expect(mocks.findFirst).not.toHaveBeenCalled(); expect(mocks.read).not.toHaveBeenCalled();
  });
  it("serves only the stored preview key with a bounded JPEG response", async () => {
    mocks.findFirst.mockResolvedValue({ imageKey: "original-key", imagePreviewKey: "preview-key" }); mocks.read.mockResolvedValue(Buffer.from([0xff, 0xd8, 0xff]));
    const response = await GET(new Request(`https://chumkosoft.com/api/line/announcement-images/${imageId}?size=preview`), { params: Promise.resolve({ id: imageId }) });
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { imageId, isDeleted: false } }));
    expect(mocks.read).toHaveBeenCalledWith("preview-key", 1024 * 1024);
    expect(response.status).toBe(200); expect(response.headers.get("content-type")).toBe("image/jpeg");
  });
  it("does not serve media for absent or deleted announcements", async () => {
    mocks.findFirst.mockResolvedValue(null);
    const response = await GET(new Request(`https://chumkosoft.com/api/line/announcement-images/${imageId}`), { params: Promise.resolve({ id: imageId }) });
    expect(response.status).toBe(404); expect(mocks.read).not.toHaveBeenCalled();
  });
});
