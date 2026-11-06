import "server-only";

import * as repo from "@/features/faces/repositories/scan-repository";
import { findBestMatch } from "@/features/faces/lib/match";
import { notifyGuardiansOfCheckIn } from "@/features/line/services/line-service";
import { getScanSetting } from "@/features/kiosk/repositories/kiosk-repository";
import { logAudit } from "@/lib/audit";

/**
 * face-api.js descriptor match threshold (Euclidean). 0.6 is the library default;
 * we default to a slightly stricter 0.55 to reduce false positives at the gate.
 * Tune per deployment via FACE_MATCH_THRESHOLD (lower = stricter).
 */
function matchThreshold(): number {
  const raw = Number(process.env.FACE_MATCH_THRESHOLD);
  return Number.isFinite(raw) && raw > 0 && raw < 1 ? raw : 0.55;
}

export type ScanStatus = "matched" | "already" | "no_match" | "not_ready" | "closed";

export interface ScanResult {
  status: ScanStatus;
  studentId?: string;
  studentName?: string;
  classroom?: string;
  /** Bangkok HH:mm of the check-in. */
  time?: string;
  /** True when the check-in was at/after the school's late cutoff. */
  late?: boolean;
}

export interface ScanHistoryEntry {
  studentId: string;
  studentName: string;
  classroom: string;
  time: string;
  late: boolean;
}

export type IdentifyStatus = "candidate" | "no_match" | "not_ready";

export interface IdentifyResult {
  status: IdentifyStatus;
  studentId?: string;
  studentName?: string;
  classroom?: string;
}

function todayBangkok(): { date: Date; iso: string } {
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  const [y, m, d] = iso.split("-").map(Number);
  return { date: new Date(Date.UTC(y, m - 1, d)), iso };
}

function bangkokTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

/** Current Bangkok time as a "HH:MM" string, comparable to the scan-window settings. */
function bangkokHM(date: Date): string {
  return bangkokTime(date);
}

function formatName(s: { prefix: string | null; firstName: string; lastName: string }): string {
  return [s.prefix, `${s.firstName} ${s.lastName}`].filter(Boolean).join(" ");
}

/** Returns face check-ins already recorded for today's kiosk session. */
export async function getTodayFaceCheckIns(): Promise<ScanHistoryEntry[]> {
  const { date } = todayBangkok();
  const rows = await repo.listFaceCheckInsForDate(date);
  return rows.flatMap((row) => {
    if (!row.checkInAt) return [];
    return [{
      studentId: row.studentId,
      studentName: formatName(row.student),
      classroom: row.student.enrollments[0]?.classroom.code ?? "",
      time: bangkokTime(row.checkInAt),
      late: row.isLate,
    }];
  });
}

/**
 * Identifies a face WITHOUT recording anything. Matching runs server-side so
 * embeddings never leave the DB. The kiosk calls this every tick and only commits
 * a check-in after client-side liveness gating (temporal consistency + movement),
 * which limits single-frame false accepts and static-photo spoofing.
 */
export async function identifyFace(descriptor: number[]): Promise<IdentifyResult> {
  if (descriptor.length !== 128) return { status: "no_match" };

  const termId = await repo.getActiveTermId();
  if (!termId) return { status: "not_ready" };

  const templates = await repo.loadMatchableTemplates(termId);
  if (templates.length === 0) return { status: "not_ready" };

  const match = findBestMatch(descriptor, templates, matchThreshold());
  if (match === null) return { status: "no_match" };

  const student = await repo.getMatchedStudent(match.studentId, termId);
  if (!student) return { status: "no_match" };

  return {
    status: "candidate",
    studentId: match.studentId,
    studentName: formatName(student),
    classroom: student.enrollments[0]?.classroom.code ?? "",
  };
}

/**
 * Commits a gate check-in for a student the kiosk has already identified and
 * passed liveness for. Records SchoolEntry(FACE), audits, and notifies guardians.
 */
export async function commitCheckIn(studentId: string, actorId?: string): Promise<ScanResult> {
  const termId = await repo.getActiveTermId();
  if (!termId) return { status: "not_ready" };

  const student = await repo.getMatchedStudent(studentId, termId);
  if (!student) return { status: "no_match" };

  const setting = await getScanSetting();
  const now = new Date();
  const nowHM = bangkokHM(now);
  // Gate closed before opening time — never record an early check-in.
  if (nowHM < setting.scanStartTime) {
    return { status: "closed" };
  }
  const late = nowHM >= setting.lateAfterTime;

  const { date } = todayBangkok();
  const entry = await repo.recordFaceCheckIn(termId, studentId, date, now, late);

  const studentName = formatName(student);
  const classroom = student.enrollments[0]?.classroom.code ?? "";
  const time = bangkokTime(entry.at);

  if (!entry.alreadyCheckedIn) {
    await logAudit({
      actorId,
      action: "face.checkin",
      targetType: "student",
      targetId: studentId,
      detail: `${studentName} · ${time}${entry.isLate ? " · สาย" : ""}`,
    });
    const message = entry.isLate ? `${studentName} เข้าโรงเรียนแล้ว (มาสาย) เมื่อเวลา ${time} น.` : undefined;
    // Fire-and-forget: a LINE failure must never block the gate.
    void notifyGuardiansOfCheckIn(studentId, studentName, time, message).catch(() => undefined);
  }

  return { status: entry.alreadyCheckedIn ? "already" : "matched", studentId, studentName, classroom, time, late: entry.isLate };
}
