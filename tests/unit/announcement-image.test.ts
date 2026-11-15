import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { prepareAnnouncementImage } from "@/features/line/services/announcement-image-service";
import { announcementImageMessage, announcementImagePath, MAX_ANNOUNCEMENT_IMAGE_BYTES } from "@/features/line/announcement-image";

const id = "00000000-0000-4000-8000-000000000001";
describe("announcement image encoding", () => {
  it("decodes WebP and produces bounded JPEG original and preview without metadata", async () => {
    const bytes = await sharp({ create: { width: 100, height: 80, channels: 3, background: "#2274aa" } }).withExif({ IFD0: { Artist: "private metadata" } }).webp().toBuffer();
    const output = await prepareAnnouncementImage(new File([new Uint8Array(bytes)], "picture.webp", { type: "image/webp" }));
    const original = await sharp(output.original).metadata();
    const preview = await sharp(output.preview).metadata();
    expect(original.format).toBe("jpeg"); expect(preview.format).toBe("jpeg");
    expect(original.exif).toBeUndefined(); expect(preview.exif).toBeUndefined();
    expect(output.preview.length).toBeLessThan(1024 * 1024);
    expect(output.digest).toMatch(/^[a-f0-9]{64}$/);
  });
  it("refuses content disguised as a supported file type", async () => {
    const file = new File(['<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'], "fake.png", { type: "image/png" });
    await expect(prepareAnnouncementImage(file)).rejects.toThrow("อ่านรูปไม่สำเร็จ");
  });
  it("rejects oversized input before decoding", async () => {
    const file = new File([new Uint8Array(MAX_ANNOUNCEMENT_IMAGE_BYTES + 1)], "large.jpg", { type: "image/jpeg" });
    await expect(prepareAnnouncementImage(file)).rejects.toThrow("3 MB");
  });
  it("uses stable HTTPS image URLs and a separate preview", () => {
    expect(announcementImageMessage(id)).toEqual({ type: "image", originalContentUrl: `https://chumkosoft.com/api/line/announcement-images/${id}`, previewImageUrl: `https://chumkosoft.com/api/line/announcement-images/${id}?size=preview` });
    expect(() => announcementImagePath("../../private")).toThrow();
  });
});
