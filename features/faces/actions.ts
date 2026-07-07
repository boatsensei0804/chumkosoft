"use server";

import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
import { descriptorSchema, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/features/faces/schemas/face-schema";
import { enrollFace, removeFaceTemplate, setFaceConsent } from "@/features/faces/services/face-service";
import { runAction } from "@/lib/action-error";
import type { ActionResult } from "@/types/form";

const FACES_PATH = "/dashboard/faces";

/**
 * Enrolls one face photo: the client has already detected the face and computed
 * its 128-d descriptor with face-api.js; the server re-validates shape and file,
 * stores the image in MinIO, and records the FaceTemplate row.
 */
export async function uploadFaceAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireRoles(STAFF_ROLES);

    const studentId = formData.get("studentId");
    if (typeof studentId !== "string" || studentId === "") {
      return { ok: false, message: "ไม่พบนักเรียน" };
    }

    const descriptorRaw = formData.get("descriptor");
    if (typeof descriptorRaw !== "string") {
      return { ok: false, message: "ข้อมูลใบหน้าไม่ถูกต้อง" };
    }
    let descriptorJson: unknown;
    try {
      descriptorJson = JSON.parse(descriptorRaw);
    } catch {
      return { ok: false, message: "ข้อมูลใบหน้าไม่ถูกต้อง" };
    }
    const descriptor = descriptorSchema.safeParse(descriptorJson);
    if (!descriptor.success) {
      return { ok: false, message: descriptor.error.issues[0]?.message ?? "ข้อมูลใบหน้าไม่ถูกต้อง" };
    }

    const image = formData.get("image");
    if (!(image instanceof File)) {
      return { ok: false, message: "ไม่พบไฟล์รูป" };
    }
    if (!ALLOWED_IMAGE_TYPES.includes(image.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      return { ok: false, message: "รองรับเฉพาะไฟล์ JPEG, PNG หรือ WebP" };
    }
    if (image.size > MAX_IMAGE_BYTES) {
      return { ok: false, message: "ไฟล์รูปใหญ่เกินไป (สูงสุด 3MB)" };
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const result = await enrollFace(studentId, descriptor.data, buffer, user.id);
    if (result.ok) {
      revalidatePath(FACES_PATH);
    }
    return result;
  });
}

export async function deleteFaceTemplateAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireRoles(STAFF_ROLES);
    const result = await removeFaceTemplate(id, user.id);
    if (result.ok) {
      revalidatePath(FACES_PATH);
    }
    return result;
  });
}

export async function setFaceConsentAction(studentId: string, consent: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireRoles(STAFF_ROLES);
    const result = await setFaceConsent(studentId, consent, user.id);
    if (result.ok) {
      revalidatePath(FACES_PATH);
    }
    return result;
  });
}
