import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { ANNOUNCEMENT_IMAGE_TYPES, MAX_ANNOUNCEMENT_IMAGE_BYTES } from "@/features/line/announcement-image";

export interface PreparedAnnouncementImage {
  original: Buffer;
  preview: Buffer;
  digest: string;
}

/** Decode on the server; never trust the extension or MIME supplied by a browser. */
export async function prepareAnnouncementImage(file: File): Promise<PreparedAnnouncementImage> {
  if (file.size === 0 || file.size > MAX_ANNOUNCEMENT_IMAGE_BYTES || !ANNOUNCEMENT_IMAGE_TYPES.includes(file.type as typeof ANNOUNCEMENT_IMAGE_TYPES[number])) {
    throw new Error("แนบได้เฉพาะ JPG, PNG หรือ WebP ขนาดไม่เกิน 3 MB");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  try {
    const options = { limitInputPixels: 20_000_000, failOn: "warning" as const };
    const metadata = await sharp(bytes, options).metadata();
    if (!metadata.width || !metadata.height || !["jpeg", "png", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) !== 1) {
      throw new Error("unsupported image");
    }
    // auto-orient; strip metadata and flatten transparency for a predictable JPEG.
    const original = await sharp(bytes, options).rotate().resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 85 }).toBuffer();
    const preview = await sharp(original).resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer();
    if (original.length > 10 * 1024 * 1024 || preview.length > 1024 * 1024) throw new Error("output too large");
    return { original, preview, digest: createHash("sha256").update(bytes).digest("hex") };
  } catch {
    throw new Error("อ่านรูปไม่สำเร็จ กรุณาเลือกรูป JPG, PNG หรือ WebP ที่ไม่ใช่ภาพเคลื่อนไหว และไม่เกิน 20 ล้านพิกเซล");
  }
}
