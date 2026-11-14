import "server-only";
import { createHash } from "node:crypto";
import prisma from "@/lib/prisma";
import { announcementAudienceSchema, selectAudience, type AudienceCandidate, type AudienceOptions } from "@/features/line/announcement-audience";

async function catalog(): Promise<{ candidates: AudienceCandidate[]; classrooms: AudienceOptions["classrooms"] }> {
  const [guardians, accounts, staff, enrollments, rooms] = await Promise.all([
    prisma.guardian.findMany({ where: { isDeleted: false, student: { isDeleted: false }, lineUserId: { not: null } }, select: { id: true, fullName: true, studentId: true, lineUserId: true, student: { select: { firstName: true, lastName: true, studentCode: true } } } }),
    prisma.studentLineAccount.findMany({ where: { student: { isDeleted: false }, lineUserId: { not: null } }, select: { id: true, studentId: true, lineUserId: true, student: { select: { firstName: true, lastName: true, studentCode: true } } } }),
    prisma.staff.findMany({ where: { isDeleted: false, lineUserId: { not: null } }, select: { id: true, firstName: true, lastName: true, staffCode: true, lineUserId: true } }),
    prisma.enrollment.findMany({ where: { isDeleted: false, student: { isDeleted: false }, classroom: { isDeleted: false }, term: { isActive: true, isDeleted: false, academicYear: { isActive: true, isDeleted: false } } }, select: { studentId: true, classroomId: true } }),
    prisma.classroom.findMany({ where: { isDeleted: false, academicYear: { isActive: true, isDeleted: false } }, select: { id: true, code: true }, orderBy: { code: "asc" } }),
  ]);
  const studentRooms = new Map<string, string[]>();
  for (const enrollment of enrollments) studentRooms.set(enrollment.studentId, [...(studentRooms.get(enrollment.studentId) ?? []), enrollment.classroomId]);
  const candidates: AudienceCandidate[] = [];
  for (const row of guardians) if (row.lineUserId) candidates.push({ id: `guardian:${row.id}`, label: `${row.fullName} · ผู้ปกครองของ ${row.student.firstName} ${row.student.lastName} (${row.student.studentCode})`, kind: "parent", classroomIds: studentRooms.get(row.studentId) ?? [], lineUserId: row.lineUserId });
  for (const row of accounts) if (row.lineUserId) candidates.push({ id: `account:${row.id}`, label: `ผู้ปกครองของ ${row.student.firstName} ${row.student.lastName} (${row.student.studentCode}) · บัญชี ${row.id.slice(-6)}`, kind: "parent", classroomIds: studentRooms.get(row.studentId) ?? [], lineUserId: row.lineUserId });
  for (const row of staff) if (row.lineUserId) candidates.push({ id: `staff:${row.id}`, label: `${row.firstName} ${row.lastName} (${row.staffCode}) · ครู/บุคลากร`, kind: "staff", classroomIds: [], lineUserId: row.lineUserId });
  return { candidates, classrooms: rooms.map((room) => ({ id: room.id, label: room.code })) };
}

export function recipientFingerprint(recipients: string[]): string {
  return createHash("sha256").update(JSON.stringify([...new Set(recipients)].sort())).digest("hex");
}

export async function getAnnouncementAudienceOptions(): Promise<AudienceOptions> {
  const data = await catalog();
  return { classrooms: data.classrooms, people: data.candidates.map(({ id, label, kind }) => ({ id, label, kind })) };
}

export async function resolveAnnouncementAudience(input: unknown) {
  const audience = announcementAudienceSchema.parse(input);
  const data = await catalog();
  const validIds = new Set(audience.mode === "classrooms" ? data.classrooms.map((room) => room.id) : data.candidates.map((person) => person.id));
  if ("ids" in audience && audience.ids.some((id) => !validIds.has(id))) throw new Error("AUDIENCE_CHANGED");
  const selected = selectAudience(data.candidates, audience);
  const recipients = [...new Set(selected.map((person) => person.lineUserId))].sort();
  const labels = new Map<string, Set<string>>();
  for (const person of selected) {
    const names = labels.get(person.lineUserId) ?? new Set<string>(); names.add(person.label); labels.set(person.lineUserId, names);
  }
  return { recipients, fingerprint: recipientFingerprint(recipients), labels: recipients.map((id) => [...labels.get(id)!].join(" / ")) };
}
