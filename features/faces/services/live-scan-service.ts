import "server-only";

import type { Prisma, Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { formatBangkokTime } from "@/utils/thai-date";
import { getDisplaySession } from "@/lib/session";
import type { LiveScan } from "@/features/faces/live-scan";

const displayTimeMs = 15_000;
type Viewer = { id: string; role: Role };

function deviceScope(viewer: Viewer): Prisma.ScannerDeviceWhereInput {
  return {
    removedAt: null, kioskUser: { role: "KIOSK", isActive: true, isDeleted: false },
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

export async function getDisplayViewer() {
  const session = await getDisplaySession();
  if (!session) return null;
  return prisma.user.findFirst({
    where: { id: session.userId, role: "KIOSK", isActive: true, isDeleted: false },
    select: { id: true, role: true },
  });
}

export async function getLiveScan(viewer: Viewer, deviceId: string | null) {
  const device = deviceId && await prisma.scannerDevice.findFirst({
    where: { ...deviceScope(viewer), id: deviceId },
    select: { displayOverride: true, displayScheduleEnabled: true, displayOnTime: true, displayOffTime: true,
      showStudentName: true, showScanTime: true, showScanHistory: true },
  });
  const empty = { scan: null, history: [], paused: true };
  if (!device) return empty;
  const now = new Date();
  const time = formatBangkokTime(now);
  const { displayOnTime: on, displayOffTime: off } = device;
  const inSchedule = on < off ? time >= on && time < off : time >= on || time < off;
  if (device.displayOverride === "OFF" || (device.displayOverride === "AUTO" && device.displayScheduleEnabled && !inSchedule)) return empty;
  const midnight = new Date(now.getTime() + 7 * 3600000);
  midnight.setUTCHours(0, 0, 0, 0);
  const events = await prisma.scannerSyncEvent.findMany({
    where: { deviceId: deviceId!, capturedAt: { gte: new Date(midnight.getTime() - 7 * 3600000), lte: new Date(now.getTime() + 300000) },
      result: { in: ["checked_in", "checked_out", "already_in", "already_out"] } },
    orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }, { eventId: "desc" }], take: device.showScanHistory ? 6 : 1,
    select: { eventId: true, studentId: true, capturedAt: true, createdAt: true, result: true },
  });
  const students = await prisma.student.findMany({
    where: { id: { in: events.map(e => e.studentId) }, isDeleted: false, faceConsent: true },
    select: { id: true, firstName: true, lastName: true },
  });
  const rows: LiveScan[] = events.flatMap(e => {
    const student = students.find(s => s.id === e.studentId);
    if (!student) return [];
    return [{ id: e.eventId, firstName: device.showStudentName ? [student.firstName, student.lastName].join(" ") : "",
      time: device.showScanTime ? formatBangkokTime(e.capturedAt) : "", direction: e.result.endsWith("_out") ? "out" : "in",
      alreadyRecorded: e.result.startsWith("already"), visibleForMs: Math.min(e.createdAt.getTime(), e.capturedAt.getTime()) + displayTimeMs - Date.now() }];
  });
  const scan = rows[0]?.visibleForMs > 0 ? rows[0] : null;
  return { paused: false, scan, history: device.showScanHistory ? rows.filter(row => row !== scan).slice(0,5) : [] };
}
