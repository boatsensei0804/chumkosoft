import "server-only";

import { randomUUID } from "node:crypto";
import * as repo from "@/features/faces/repositories/face-repository";
import { putObject, presignedGetUrl, removeObject } from "@/lib/minio";
import { logAudit } from "@/lib/audit";
import { formatThaiDate } from "@/utils/thai-date";
import type { FaceStudentRow, FaceStudentDetail, ClassroomFaceProgress, ClassroomFaceMember } from "@/features/faces/types";
import type { ActionResult } from "@/types/form";

function formatName(s: { prefix: string | null; firstName: string; lastName: string }): string {
  return [s.prefix, `${s.firstName} ${s.lastName}`].filter(Boolean).join(" ");
}

/** Students + template counts for the dataset browser. */
export async function listFaceStudents(): Promise<FaceStudentRow[]> {
  const rows = await repo.findStudentsWithFaceCounts();
  return rows.map((s) => ({
    id: s.id,
    code: s.studentCode,
    name: formatName(s),
    classroom: s.enrollments[0]?.classroom.code ?? "—",
    templateCount: s._count.faceTemplates,
  }));
}

/** Per-classroom face-enrolment progress for the active term, ordered by room code. */
export async function listClassroomFaceProgress(): Promise<ClassroomFaceProgress[]> {
  const rows = await repo.findEnrollmentsWithFaceCounts();

  const byRoom = new Map<string, ClassroomFaceProgress>();
  for (const row of rows) {
    let room = byRoom.get(row.classroom.id);
    if (!room) {
      room = {
        classroomId: row.classroom.id,
        code: row.classroom.code,
        gradeLevel: row.classroom.gradeLevel,
        total: 0,
        enrolled: 0,
        members: [],
      };
      byRoom.set(row.classroom.id, room);
    }
    const templateCount = row.student._count.faceTemplates;
    const member: ClassroomFaceMember = {
      id: row.student.id,
      code: row.student.studentCode,
      name: formatName(row.student),
      templateCount,
    };
    room.members.push(member);
    room.total += 1;
    if (templateCount > 0) room.enrolled += 1;
  }

  return [...byRoom.values()];
}

/** One student's enrolled photos, with short-lived signed URLs for display. */
export async function getFaceStudentDetail(studentId: string): Promise<FaceStudentDetail | null> {
  const student = await repo.getStudentRef(studentId);
  if (!student) return null;

  const templates = await repo.findTemplates(studentId);
  const views = await Promise.all(
    templates.map(async (t) => ({
      id: t.id,
      imageUrl: await presignedGetUrl(t.imageKey),
      createdAt: formatThaiDate(t.createdAt),
    })),
  );

  return {
    id: student.id,
    code: student.studentCode,
    name: formatName(student),
    consent: student.faceConsent,
    consentAt: student.faceConsentAt ? formatThaiDate(student.faceConsentAt) : null,
    templates: views,
  };
}

/** Records or withdraws guardian consent to store this student's face data. */
export async function setFaceConsent(studentId: string, consent: boolean, actorId?: string): Promise<ActionResult> {
  const student = await repo.getStudentRef(studentId);
  if (!student) return { ok: false, message: "ไม่พบนักเรียน" };
  await repo.setFaceConsent(studentId, consent);
  await logAudit({
    actorId,
    action: consent ? "consent.grant" : "consent.revoke",
    targetType: "student",
    targetId: studentId,
    detail: formatName(student),
  });
  return { ok: true, message: consent ? "บันทึกความยินยอมแล้ว" : "ยกเลิกความยินยอมแล้ว" };
}

/** Stores the photo in MinIO and records its embedding as a FaceTemplate. */
export async function enrollFace(studentId: string, embedding: number[], image: Buffer, actorId?: string): Promise<ActionResult> {
  const student = await repo.getStudentRef(studentId);
  if (!student) {
    return { ok: false, message: "ไม่พบนักเรียน" };
  }
  if (!student.faceConsent) {
    return { ok: false, message: "ต้องบันทึกความยินยอมของผู้ปกครองก่อนจึงจะเพิ่มรูปใบหน้าได้ (PDPA)" };
  }

  const imageKey = `faces/${studentId}/${randomUUID()}.jpg`;
  await putObject(imageKey, image, "image/jpeg");
  await repo.createTemplate({ studentId, embedding, imageKey });
  await logAudit({ actorId, action: "face.enroll", targetType: "student", targetId: studentId, detail: formatName(student) });

  return { ok: true, message: "เพิ่มรูปใบหน้าเรียบร้อย" };
}

/** Soft-deletes a template and purges its photo from MinIO (data minimization). */
export async function removeFaceTemplate(id: string, actorId?: string): Promise<ActionResult> {
  const template = await repo.getTemplateForRemoval(id);
  if (!template) {
    return { ok: false, message: "ไม่พบรูปที่ต้องการลบ" };
  }
  await repo.softDeleteTemplate(id);
  await removeObject(template.imageKey);
  await logAudit({ actorId, action: "face.delete", targetType: "student", targetId: template.studentId });
  return { ok: true, message: "ลบรูปใบหน้าเรียบร้อย" };
}

export async function getFaceEnrollmentStats(): Promise<repo.FaceEnrollmentStats> {
  return repo.getEnrollmentStats();
}
