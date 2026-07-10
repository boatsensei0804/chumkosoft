import {
  findCourses,
  countCourses,
  countCoursesWithActiveOfferings,
  courseCodeExists,
  createCourse,
  updateCourse,
  softDeleteCourse,
  courseHasActiveOfferings,
} from "@/repositories/course-repository";
import type { CourseInput } from "@/features/courses/schemas/course-schema";
import type { CourseSummary } from "@/features/courses/types";
import type { ActionResult } from "@/types/form";
import { paginate, DEFAULT_PAGE_SIZE, type Paginated } from "@/types/pagination";

function toSummary(c: Awaited<ReturnType<typeof findCourses>>[number]): CourseSummary {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    credits: c.credits,
    description: c.description,
    offeringsCount: c._count.offerings,
  };
}

export async function listCoursesPaginated(params: { page: number; search: string }): Promise<Paginated<CourseSummary>> {
  const pageSize = DEFAULT_PAGE_SIZE;
  const skip = (params.page - 1) * pageSize;
  const [rows, total] = await Promise.all([
    findCourses({ skip, take: pageSize, search: params.search }),
    countCourses(params.search),
  ]);
  return paginate(rows.map(toSummary), total, params.page, pageSize);
}

/** Totals for the page's stat strip. */
export async function getCourseStats(): Promise<{ total: number; open: number }> {
  const [total, open] = await Promise.all([countCourses(""), countCoursesWithActiveOfferings()]);
  return { total, open };
}

export async function createCourseRecord(input: CourseInput): Promise<ActionResult> {
  if (await courseCodeExists(input.code)) {
    return { ok: false, fieldErrors: { code: "รหัสวิชานี้ถูกใช้แล้ว" } };
  }
  await createCourse(input);
  return { ok: true, message: "เพิ่มรายวิชาเรียบร้อย" };
}

export async function updateCourseRecord(id: string, input: CourseInput): Promise<ActionResult> {
  if (await courseCodeExists(input.code, id)) {
    return { ok: false, fieldErrors: { code: "รหัสวิชานี้ถูกใช้แล้ว" } };
  }
  await updateCourse(id, input);
  return { ok: true, message: "บันทึกการแก้ไขเรียบร้อย" };
}

export async function deleteCourseRecord(id: string): Promise<ActionResult> {
  if (await courseHasActiveOfferings(id)) {
    return { ok: false, message: "ลบไม่ได้ เพราะรายวิชานี้ยังเปิดสอนอยู่ในภาคเรียนปัจจุบัน" };
  }
  await softDeleteCourse(id);
  return { ok: true, message: "ลบรายวิชาเรียบร้อย" };
}
