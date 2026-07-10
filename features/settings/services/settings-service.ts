import "server-only";

import * as repo from "@/features/settings/repositories/settings-repository";
import type { YearInput, TermInput, PeriodInput } from "@/features/settings/schemas/settings-schema";
import type { AcademicYearSetting, PeriodSetting, TermStatus } from "@/features/settings/types";
import type { ActionResult } from "@/types/form";

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** All academic years + terms, shaped for the settings UI. */
export async function getAcademicSettings(): Promise<AcademicYearSetting[]> {
  const years = await repo.listYearsWithTerms();
  return years.map((y) => ({
    id: y.id,
    buddhistYear: y.buddhistYear,
    startDate: isoDate(y.startDate),
    endDate: isoDate(y.endDate),
    isActive: y.isActive,
    terms: y.terms.map((t) => ({
      id: t.id,
      number: t.number,
      name: t.name,
      startDate: isoDate(t.startDate),
      endDate: isoDate(t.endDate),
      status: t.status as TermStatus,
      isActive: t.isActive,
    })),
  }));
}

export async function getPeriodSettings(): Promise<PeriodSetting[]> {
  const periods = await repo.listPeriods();
  return periods.map((p) => ({ id: p.id, label: p.label, startTime: p.startTime, endTime: p.endTime, isBreak: p.isBreak }));
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function saveYear(id: string | null, input: YearInput): Promise<ActionResult> {
  if (await repo.yearExists(input.buddhistYear, id ?? undefined)) {
    return { ok: false, fieldErrors: { buddhistYear: "มีปีการศึกษานี้อยู่แล้ว" } };
  }
  if (id) {
    await repo.updateYear(id, input);
    return { ok: true, message: "บันทึกปีการศึกษาเรียบร้อย" };
  }
  await repo.createYear(input);
  return { ok: true, message: "เพิ่มปีการศึกษาเรียบร้อย" };
}

export async function setActiveYear(id: string): Promise<ActionResult> {
  await repo.setActiveYear(id);
  return { ok: true, message: "ตั้งเป็นปีปัจจุบันแล้ว" };
}

export async function saveTerm(id: string | null, academicYearId: string, input: TermInput): Promise<ActionResult> {
  if (await repo.termNumberExists(academicYearId, input.number, id ?? undefined)) {
    return { ok: false, fieldErrors: { number: "มีภาคเรียนหมายเลขนี้ในปีการศึกษานี้แล้ว" } };
  }
  if (id) {
    await repo.updateTerm(id, { number: input.number, name: input.name, startDate: input.startDate, endDate: input.endDate, status: input.status });
    return { ok: true, message: "บันทึกภาคเรียนเรียบร้อย" };
  }
  await repo.createTerm({ academicYearId, ...input });
  return { ok: true, message: "เพิ่มภาคเรียนเรียบร้อย" };
}

export async function setActiveTerm(termId: string): Promise<ActionResult> {
  const term = await repo.getTermYear(termId);
  if (!term) return { ok: false, message: "ไม่พบภาคเรียน" };
  await repo.setActiveTerm(termId, term.academicYearId);
  return { ok: true, message: "ตั้งเป็นภาคเรียนปัจจุบันแล้ว ข้อมูลทั้งระบบจะอ้างอิงภาคเรียนนี้" };
}

export async function deleteYear(id: string): Promise<ActionResult> {
  const year = await repo.getYearRef(id);
  if (!year) return { ok: false, message: "ไม่พบปีการศึกษา" };
  if (year.isActive) {
    return { ok: false, message: "ลบปีปัจจุบันไม่ได้ กรุณาตั้งปีอื่นเป็นปีปัจจุบันก่อน" };
  }
  if (await repo.yearHasEnrolledStudents(id)) {
    return { ok: false, message: "ลบไม่ได้ เพราะมีนักเรียนลงทะเบียนในปีการศึกษานี้" };
  }
  await repo.softDeleteYear(id);
  return { ok: true, message: "ลบปีการศึกษาเรียบร้อย (ซ่อนพร้อมภาคเรียนในปีนี้)" };
}

export async function deleteTerm(id: string): Promise<ActionResult> {
  await repo.softDeleteTerm(id);
  return { ok: true, message: "ลบภาคเรียนเรียบร้อย" };
}

export async function savePeriods(items: PeriodInput[]): Promise<ActionResult> {
  const result = await repo.bulkSavePeriods(items);
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, message: "บันทึกคาบเรียนเรียบร้อย" };
}
