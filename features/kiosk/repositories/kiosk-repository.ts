import "server-only";

import prisma from "@/lib/prisma";
import type { ScanSettingInput } from "@/features/kiosk/schemas/kiosk-schema";

const SINGLETON = "singleton";

// ── Scan-window settings (single row) ────────────────────────────────────────

export async function getScanSetting(): Promise<{ scanStartTime: string; lateAfterTime: string }> {
  const row = await prisma.scanSetting.findUnique({
    where: { id: SINGLETON },
    select: { scanStartTime: true, lateAfterTime: true },
  });
  return row ?? { scanStartTime: "06:30", lateAfterTime: "08:00" };
}

export async function upsertScanSetting(data: ScanSettingInput): Promise<void> {
  await prisma.scanSetting.upsert({
    where: { id: SINGLETON },
    update: data,
    create: { id: SINGLETON, ...data },
  });
}

// ── Kiosk accounts (User rows with role KIOSK) ───────────────────────────────

export async function listKioskAccounts() {
  return prisma.user.findMany({
    where: { role: "KIOSK", isDeleted: false },
    orderBy: { email: "asc" },
    select: { id: true, email: true, isActive: true, createdAt: true },
  });
}

export async function kioskEmailExists(email: string, excludeId?: string): Promise<boolean> {
  const row = await prisma.user.findFirst({
    where: { email, isDeleted: false, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return row !== null;
}

export async function getKioskAccount(id: string) {
  return prisma.user.findFirst({ where: { id, role: "KIOSK", isDeleted: false }, select: { id: true, email: true } });
}

export async function createKioskAccount(email: string, passwordHash: string): Promise<{ id: string }> {
  return prisma.user.create({ data: { email, passwordHash, role: "KIOSK" }, select: { id: true } });
}

export async function updateKioskAccount(id: string, data: { email: string; isActive: boolean }): Promise<void> {
  await prisma.user.update({ where: { id }, data });
}

export async function setKioskPassword(id: string, passwordHash: string): Promise<void> {
  await prisma.user.update({ where: { id }, data: { passwordHash } });
}

/** Soft delete; frees the unique email so it can be reused. */
export async function softDeleteKioskAccount(id: string): Promise<void> {
  const row = await prisma.user.findUnique({ where: { id }, select: { email: true, isDeleted: true } });
  if (!row || row.isDeleted) return;
  await prisma.user.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), isActive: false, email: `${row.email}::deleted::${id}` },
  });
}
