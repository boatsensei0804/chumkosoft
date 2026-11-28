import "server-only";

import type { Prisma, Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { formatBangkokTime } from "@/utils/thai-date";
import type { LiveScan } from "@/features/faces/live-scan";

const displayTimeMs = 15_000;
type Viewer = { id: string; role: Role };

function deviceScope(viewer: Viewer): Prisma.ScannerDeviceWhereInput {
  return {
    kioskUser: { role: "KIOSK", isActive: true, isDeleted: false },
    ...(viewer.role === "KIOSK" && { kioskUserId: viewer.id }),
  };
}

export function listLiveScanDevices(viewer: Viewer) {
  return prisma.scannerDevice.findMany({
    where: deviceScope(viewer),
    select: { id: true, name: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
}

export async function getLiveScan(viewer: Viewer, deviceId: string | null): Promise<LiveScan | null> {
  const now = new Date();
  const earliest = new Date(now.getTime() - displayTimeMs);
  const latest = new Date(now.getTime() + 5 * 60_000);
  const scan = await prisma.scannerSyncEvent.findFirst({
    where: {
      device: deviceScope(viewer),
      ...(deviceId && { deviceId }),
      // Omit old uploads and stop showing names after a short window.
      createdAt: { gt: earliest },
      capturedAt: { gt: earliest, lte: latest },
      result: { in: ["checked_in", "checked_out", "already_in", "already_out"] },
    },
    select: { eventId: true, studentId: true, result: true, capturedAt: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { capturedAt: "desc" }, { eventId: "desc" }],
  });
  if (!scan) return null;

  const student = await prisma.student.findFirst({
    where: { id: scan.studentId, isDeleted: false, faceConsent: true },
    select: { firstName: true },
  });
  const visibleForMs = Math.min(scan.createdAt.getTime(), scan.capturedAt.getTime()) + displayTimeMs - Date.now();
  if (!student || visibleForMs <= 0) return null;
  return {
    id: scan.eventId,
    direction: scan.result === "checked_out" || scan.result === "already_out" ? "out" : "in",
    alreadyRecorded: scan.result === "already_in" || scan.result === "already_out",
    firstName: student.firstName,
    time: formatBangkokTime(scan.capturedAt),
    visibleForMs,
  };
}
