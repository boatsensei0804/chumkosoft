import "server-only";

import * as repo from "@/features/classrooms/repositories/classroom-repository";
import { getActiveTermLabel } from "@/services/dashboard-service";
import type { ClassroomInput } from "@/features/classrooms/schemas/classroom-schema";
import type { OfferingInput } from "@/features/classrooms/schemas/offering-schema";
import type {
  ClassroomRow,
  ClassroomDetail,
  TeacherOption,
  RosterStatus,
  OfferingRow,
  OfferingOptions,
} from "@/features/classrooms/types";
import type { ActionResult } from "@/types/form";

const statusMap: Record<string, RosterStatus> = { ACTIVE: "active", PENDING: "pending", LEAVE: "leave" };

function personName(p: { prefix: string | null; firstName: string; lastName: string } | null): string | null {
  if (!p) return null;
  return [p.prefix, `${p.firstName} ${p.lastName}`].filter(Boolean).join(" ");
}

function roomName(r: { code: string; name: string | null }): string {
  return r.name ? `${r.name} (${r.code})` : r.code;
}

/** Classrooms in the active year, with homeroom teacher + roster/offering counts. */
export async function listClassrooms(): Promise<ClassroomRow[]> {
  const yearId = await repo.getActiveYearId();
  if (!yearId) return [];
  const termId = await repo.getActiveTermId();
  const rows = await repo.listClassrooms(yearId, termId);
  return rows.map((c) => ({
    id: c.id,
    code: c.code,
    gradeLevel: c.gradeLevel,
    advisors: c.advisors.map((a) => ({ id: a.staffId, name: personName(a.staff) ?? a.staffId })),
    studentCount: c._count.enrollments,
    offeringCount: c._count.offerings,
  }));
}

export async function listTeacherOptions(): Promise<TeacherOption[]> {
  const rows = await repo.findTeacherOptions();
  return rows.map((t) => ({ id: t.id, name: personName(t) ?? t.id }));
}

/** Full classroom view: homeroom teacher + this-term roster + this-term offerings. */
export async function getClassroomDetail(id: string): Promise<ClassroomDetail | null> {
  const classroom = await repo.getClassroom(id);
  if (!classroom) return null;

  const termId = await repo.getActiveTermId();
  const [roster, offeringRows, termLabel] = await Promise.all([
    termId ? repo.findRoster(id, termId) : Promise.resolve([]),
    termId ? repo.findOfferings(id, termId) : Promise.resolve([]),
    getActiveTermLabel(),
  ]);

  const offerings: OfferingRow[] = offeringRows.map((o) => ({
    id: o.id,
    courseCode: o.course.code,
    courseName: o.course.name,
    teacher: personName(o.teacher) ?? "—",
    room: roomName(o.room),
    periodsPerWeek: o.periodsPerWeek,
  }));

  return {
    id: classroom.id,
    code: classroom.code,
    gradeLevel: classroom.gradeLevel,
    advisors: classroom.advisors.map((a) => ({ name: personName(a.staff) ?? "—", position: a.staff.position ?? null })),
    termLabel,
    roster: roster.map((s) => ({
      id: s.id,
      code: s.studentCode,
      name: personName(s) ?? s.studentCode,
      status: statusMap[s.status] ?? "active",
    })),
    offerings,
  };
}

async function validateAdvisors(advisorIds: string[]): Promise<ActionResult | null> {
  if (!(await repo.allStaffExist(advisorIds))) {
    return { ok: false, fieldErrors: { advisorIds: "ไม่พบครูที่เลือกบางคน" } };
  }
  return null;
}

export async function createClassroomRecord(input: ClassroomInput): Promise<ActionResult> {
  const yearId = await repo.getActiveYearId();
  if (!yearId) return { ok: false, message: "ยังไม่ได้ตั้งค่าปีการศึกษาที่ใช้งาน" };
  if (await repo.classroomCodeExists(yearId, input.code)) {
    return { ok: false, fieldErrors: { code: "มีห้องเรียนชื่อนี้อยู่แล้วในปีการศึกษานี้" } };
  }
  const invalid = await validateAdvisors(input.advisorIds);
  if (invalid) return invalid;

  await repo.createClassroom(yearId, input);
  return { ok: true, message: "เพิ่มห้องเรียนเรียบร้อย" };
}

export async function updateClassroomRecord(id: string, input: ClassroomInput): Promise<ActionResult> {
  const classroom = await repo.getClassroom(id);
  if (!classroom) return { ok: false, message: "ไม่พบห้องเรียน" };
  if (await repo.classroomCodeExists(classroom.academicYearId, input.code, id)) {
    return { ok: false, fieldErrors: { code: "มีห้องเรียนชื่อนี้อยู่แล้วในปีการศึกษานี้" } };
  }
  const invalid = await validateAdvisors(input.advisorIds);
  if (invalid) return invalid;

  await repo.updateClassroom(id, input);
  return { ok: true, message: "บันทึกการแก้ไขเรียบร้อย" };
}

export async function deleteClassroomRecord(id: string): Promise<ActionResult> {
  const termId = await repo.getActiveTermId();
  if (await repo.classroomInUse(id, termId)) {
    return { ok: false, message: "ลบไม่ได้ เพราะห้องนี้ยังมีนักเรียนหรือรายวิชาในภาคเรียนปัจจุบัน" };
  }
  await repo.softDeleteClassroom(id);
  return { ok: true, message: "ลบห้องเรียนเรียบร้อย" };
}

// ── Course offering management ────────────────────────────────────────────────

/** Options for the "assign a subject" dialog: courses, teachers, rooms. */
export async function listOfferingOptions(): Promise<OfferingOptions> {
  const [courses, teachers, rooms] = await Promise.all([
    repo.findCourseOptions(),
    repo.findTeacherOptions(),
    repo.findRoomOptions(),
  ]);
  return {
    courses: courses.map((c) => ({ id: c.id, label: `${c.code} · ${c.name}` })),
    teachers: teachers.map((t) => ({ id: t.id, name: personName(t) ?? t.id })),
    rooms: rooms.map((r) => ({ id: r.id, label: r.name ? `${r.name} (${r.code})` : r.code })),
  };
}

export async function addOfferingRecord(
  classroomId: string,
  input: OfferingInput,
  viewTermId?: string,
): Promise<ActionResult> {
  const classroom = await repo.getClassroom(classroomId);
  if (!classroom) return { ok: false, message: "ไม่พบห้องเรียน" };

  // Prefer the term the caller is viewing — the timetable can display any term via
  // its selector, so an offering must be created under that term (not the globally
  // active one) or it would land on the wrong term and never show on the board.
  // The classroom detail page passes no term and keeps using the active term.
  let termId: string | null;
  if (viewTermId) {
    if (!(await repo.termInYear(viewTermId, classroom.academicYearId))) {
      return { ok: false, message: "ภาคเรียนไม่ถูกต้องสำหรับห้องเรียนนี้" };
    }
    termId = viewTermId;
  } else {
    termId = await repo.getActiveTermId();
  }
  if (!termId) return { ok: false, message: "ยังไม่ได้ตั้งค่าภาคเรียนที่ใช้งาน" };

  const [courseOk, teacherOk, roomOk] = await Promise.all([
    repo.referenceExists("course", input.courseId),
    repo.staffExists(input.teacherId),
    repo.referenceExists("room", input.roomId),
  ]);
  if (!courseOk) return { ok: false, fieldErrors: { courseId: "ไม่พบรายวิชาที่เลือก" } };
  if (!teacherOk) return { ok: false, fieldErrors: { teacherId: "ไม่พบผู้สอนที่เลือก" } };
  if (!roomOk) return { ok: false, fieldErrors: { roomId: "ไม่พบห้องที่เลือก" } };

  if (await repo.offeringExists(termId, input.courseId, classroomId)) {
    return { ok: false, fieldErrors: { courseId: "รายวิชานี้ถูกเปิดให้ห้องนี้แล้วในภาคเรียนนี้" } };
  }

  await repo.createOffering({
    termId,
    classroomId,
    courseId: input.courseId,
    teacherId: input.teacherId,
    roomId: input.roomId,
    periodsPerWeek: input.periodsPerWeek,
  });
  return { ok: true, message: "เพิ่มรายวิชาให้ห้องเรียบร้อย" };
}

export async function deleteOfferingRecord(id: string): Promise<ActionResult> {
  const offering = await repo.getOfferingRef(id);
  if (!offering) return { ok: false, message: "ไม่พบรายวิชาของห้อง" };
  // Cascade: removing the offering also clears any periods it was placed into,
  // so the subject can be un-assigned straight from the timetable page.
  const removedSlots = await repo.softDeleteOfferingWithSlots(id);
  const suffix = removedSlots > 0 ? ` (นำ ${removedSlots} คาบออกจากตารางด้วย)` : "";
  return { ok: true, message: `นำรายวิชาออกจากห้องเรียบร้อย${suffix}` };
}

export async function getOfferingClassroomId(id: string): Promise<string | null> {
  const offering = await repo.getOfferingRef(id);
  return offering?.classroomId ?? null;
}
