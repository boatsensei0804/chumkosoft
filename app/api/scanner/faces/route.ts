import { randomUUID } from "node:crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { putObject, removeObject } from "@/lib/minio";
import { logAudit } from "@/lib/audit";
import { descriptorSchema, MAX_IMAGE_BYTES } from "@/features/faces/schemas/face-schema";
import { getActiveKioskId } from "@/features/faces/services/scanner-api-auth";
import modelManifest from "@/public/models/scanner/manifest.json";

const MAX_REQUEST_BYTES = MAX_IMAGE_BYTES + 64 * 1024;
const uploadIdSchema = z.string().uuid();

export async function POST(request: Request): Promise<Response> {
  const actorId = await getActiveKioskId();
  if (!actorId) return Response.json({ ok: false, message: "กรุณาเข้าสู่ระบบจุดสแกน" }, { status: 401 });

  const size = Number(request.headers.get("content-length"));
  if (!Number.isFinite(size) || size < 1 || size > MAX_REQUEST_BYTES) {
    return Response.json({ ok: false, message: "ไฟล์รูปใหญ่เกินไป" }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ ok: false, message: "ข้อมูลรูปไม่ถูกต้อง" }, { status: 400 });
  }
  const studentCode = form.get("studentCode");
  const uploadId = uploadIdSchema.safeParse(form.get("uploadId"));
  const embeddingRaw = form.get("embedding");
  const modelId = form.get("modelId");
  const image = form.get("image");
  if (typeof studentCode !== "string" || !studentCode.trim() || studentCode.length > 80 ||
      !uploadId.success || modelId !== modelManifest.embedding_version ||
      typeof embeddingRaw !== "string" || !(image instanceof File) ||
      image.type !== "image/jpeg" || image.size < 1000 || image.size > MAX_IMAGE_BYTES) {
    return Response.json({ ok: false, message: "ข้อมูลรูปไม่ถูกต้อง" }, { status: 400 });
  }
  let rawEmbedding: unknown;
  try {
    rawEmbedding = JSON.parse(embeddingRaw);
  } catch {
    return Response.json({ ok: false, message: "ข้อมูลใบหน้าไม่ถูกต้อง" }, { status: 400 });
  }
  const embedding = descriptorSchema.safeParse(rawEmbedding);
  if (!embedding.success) {
    return Response.json({ ok: false, message: "ข้อมูลใบหน้าไม่ถูกต้อง" }, { status: 400 });
  }
  const bytes = Buffer.from(await image.arrayBuffer());
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    return Response.json({ ok: false, message: "ต้องเป็นภาพ JPEG" }, { status: 400 });
  }

  const student = await prisma.student.findFirst({
    where: {
      studentCode: studentCode.trim(), isDeleted: false, faceConsent: true,
      enrollments: { some: { status: "ACTIVE", isDeleted: false, term: { isActive: true, isDeleted: false } } },
    },
    select: { id: true },
  });
  if (!student) {
    return Response.json({ ok: false, message: "ไม่พบนักเรียนที่ยินยอมและลงทะเบียนในภาคเรียนปัจจุบัน" }, { status: 404 });
  }
  const prior = await prisma.faceTemplate.findUnique({
    where: { uploadId: uploadId.data }, select: { studentId: true, isDeleted: true },
  });
  if (prior) {
    if (prior.studentId !== student.id || prior.isDeleted) {
      return Response.json({ ok: false, message: "รหัสอัปโหลดนี้ใช้ไม่ได้" }, { status: 409 });
    }
    return Response.json({ ok: true, already: true }, { headers: { "Cache-Control": "no-store" } });
  }

  const imageKey = `faces/${student.id}/scanner-${randomUUID()}.jpg`;
  try {
    await putObject(imageKey, bytes, "image/jpeg");
    await prisma.faceTemplate.create({
      data: { studentId: student.id, embedding: embedding.data, imageKey, modelId: modelId as string, uploadId: uploadId.data },
    });
  } catch {
    await removeObject(imageKey);
    return Response.json({ ok: false, message: "บันทึกรูปไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }
  await logAudit({ actorId, action: "scanner.face.upload", targetType: "student", targetId: student.id });
  return Response.json({ ok: true, already: false }, { headers: { "Cache-Control": "no-store" } });
}
