import { z } from "zod";

/** face-api.js recognition descriptors are always 128 finite floats. */
export const descriptorSchema = z
  .array(z.number().finite(), { message: "ข้อมูลใบหน้าไม่ถูกต้อง" })
  .length(128, "ข้อมูลใบหน้าไม่ถูกต้อง (ต้องเป็นเวกเตอร์ 128 ค่า)");

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Client resizes to ≤1024px JPEG before upload; anything bigger is rejected. */
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
