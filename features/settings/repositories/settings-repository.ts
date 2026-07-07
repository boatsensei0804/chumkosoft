import "server-only";

import prisma from "@/lib/prisma";
import type { TermStatus } from "@prisma/client";

// ── Academic year & term ────────────────────────────────────────────────────

/** All years (newest first) with their non-deleted terms ordered by number. */
export async function listYearsWithTerms() {
  return prisma.academicYear.findMany({
    where: { isDeleted: false },
    orderBy: { buddhistYear: "desc" },
    select: {
      id: true,
      buddhistYear: true,
      startDate: true,
      endDate: true,
      isActive: true,
      terms: {
        where: { isDeleted: false },
        orderBy: { number: "asc" },
        select: { id: true, number: true, name: true, startDate: true, endDate: true, status: true, isActive: true },
      },
    },
  });
}

export async function yearExists(buddhistYear: number, excludeId?: string): Promise<boolean> {
  const row = await prisma.academicYear.findFirst({
    where: { buddhistYear, isDeleted: false, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return row !== null;
}

interface YearData {
  buddhistYear: number;
  startDate: Date;
  endDate: Date;
}

export async function createYear(data: YearData): Promise<{ id: string }> {
  return prisma.academicYear.create({
    data: { ...data, name: `ปีการศึกษา ${data.buddhistYear}` },
    select: { id: true },
  });
}

export async function updateYear(id: string, data: YearData): Promise<void> {
  await prisma.academicYear.update({ where: { id }, data: { ...data, name: `ปีการศึกษา ${data.buddhistYear}` } });
}

/** Marks one year current, clearing the flag on all others (only one active). */
export async function setActiveYear(id: string): Promise<void> {
  await prisma.$transaction([
    prisma.academicYear.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    prisma.academicYear.update({ where: { id }, data: { isActive: true } }),
  ]);
}

export async function termNumberExists(academicYearId: string, number: number, excludeId?: string): Promise<boolean> {
  const row = await prisma.term.findFirst({
    where: { academicYearId, number, isDeleted: false, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return row !== null;
}

interface TermData {
  academicYearId: string;
  number: number;
  name: string;
  startDate: Date;
  endDate: Date;
  status: TermStatus;
}

export async function createTerm(data: TermData): Promise<{ id: string }> {
  return prisma.term.create({ data, select: { id: true } });
}

export async function updateTerm(id: string, data: Omit<TermData, "academicYearId">): Promise<void> {
  await prisma.term.update({ where: { id }, data });
}

export async function softDeleteTerm(id: string): Promise<void> {
  await prisma.term.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date(), isActive: false } });
}

export async function getTermYear(termId: string): Promise<{ academicYearId: string } | null> {
  return prisma.term.findFirst({ where: { id: termId, isDeleted: false }, select: { academicYearId: true } });
}

/**
 * Makes one term the current working term: clears the flag on every other term,
 * marks this one active + status ACTIVE, and activates its academic year so the
 * whole term-scoped system stays consistent.
 */
export async function setActiveTerm(termId: string, academicYearId: string): Promise<void> {
  await prisma.$transaction([
    prisma.term.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    prisma.term.update({ where: { id: termId }, data: { isActive: true, status: "ACTIVE" } }),
    prisma.academicYear.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    prisma.academicYear.update({ where: { id: academicYearId }, data: { isActive: true } }),
  ]);
}

// ── Periods ─────────────────────────────────────────────────────────────────

export async function listPeriods() {
  return prisma.period.findMany({
    where: { isDeleted: false },
    orderBy: { index: "asc" },
    select: { id: true, label: true, startTime: true, endTime: true, isBreak: true },
  });
}

async function periodInUse(periodId: string): Promise<boolean> {
  const slot = await prisma.timetableSlot.findFirst({ where: { periodId, isDeleted: false }, select: { id: true } });
  if (slot) return true;
  const att = await prisma.classAttendance.findFirst({ where: { periodId, isDeleted: false }, select: { id: true } });
  return att !== null;
}

export interface PeriodItem {
  id?: string;
  label: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
}

/**
 * Reconciles the whole period set: removed rows are soft-deleted (blocked if in
 * use), survivors updated, new rows created, and indexes reassigned in order.
 * Runs in a transaction, parking indexes in a temporary range to dodge the unique
 * `index` constraint during reassignment.
 */
export async function bulkSavePeriods(items: PeriodItem[]): Promise<{ ok: boolean; message?: string }> {
  const existing = await prisma.period.findMany({ where: { isDeleted: false }, select: { id: true } });
  const existingIds = new Set(existing.map((e) => e.id));
  const keepIds = new Set(items.filter((i) => i.id && existingIds.has(i.id)).map((i) => i.id as string));
  const toDelete = [...existingIds].filter((id) => !keepIds.has(id));

  for (const id of toDelete) {
    if (await periodInUse(id)) {
      return { ok: false, message: "มีคาบที่ถูกใช้ในตารางสอนหรือการเช็คชื่อแล้ว จึงลบไม่ได้" };
    }
  }

  await prisma.$transaction(async (tx) => {
    let sentinel = -1;
    for (const id of toDelete) {
      await tx.period.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date(), index: sentinel-- } });
    }
    let temp = 1000;
    for (const it of items) {
      if (it.id && keepIds.has(it.id)) {
        await tx.period.update({ where: { id: it.id }, data: { index: temp++ } });
      }
    }
    let finalIdx = 1;
    for (const it of items) {
      const data = { index: finalIdx++, label: it.label, startTime: it.startTime, endTime: it.endTime, isBreak: it.isBreak };
      if (it.id && keepIds.has(it.id)) {
        await tx.period.update({ where: { id: it.id }, data });
      } else {
        await tx.period.create({ data });
      }
    }
  });

  return { ok: true };
}
