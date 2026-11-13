import "server-only";

import prisma from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import { pushText } from "@/lib/line";
import { getSchoolEntryRoster, listEntryClassrooms } from "@/features/attendance/services/school-entry-service";

export async function sendAdvisorDigests(): Promise<{ sent: number; failed: number }> {
  const redis = getRedis();
  if (!redis) throw new Error("Redis is required for daily delivery control");
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  const nowTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  const setting = await prisma.advisorDigestSetting.findUnique({ where: { id: 1 }, select: { sendTime: true } });
  if (nowTime < (setting?.sendTime ?? "09:00")) return { sent: 0, failed: 0 };
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (day === 0 || day === 6) return { sent: 0, failed: 0 };

  const advisors = await prisma.staff.findMany({
    where: { isDeleted: false, lineUserId: { not: null }, advisories: { some: { classroom: { isDeleted: false, academicYear: { isActive: true, isDeleted: false } } } } },
    select: { id: true, lineUserId: true },
  });
  let sent = 0;
  let failed = 0;
  for (const advisor of advisors) {
    if (!advisor.lineUserId) continue;
    const key = `advisor-digest:${date}:${advisor.id}`;
    const acquired = await redis.set(key, "sending", "EX", 60 * 60 * 36, "NX");
    if (acquired !== "OK") continue;
    try {
      const [rooms, roster] = await Promise.all([listEntryClassrooms(advisor.id), getSchoolEntryRoster(date, "", advisor.id)]);
      if (!roster || rooms.length === 0) { await redis.del(key); continue; }
      const lines = rooms.map((room) => {
        const students = roster.students.filter((student) => student.classroomCode === room.code);
        const arrived = students.filter((student) => student.state !== "ABSENT");
        const late = arrived.filter((student) => student.isLate);
        const awaiting = students.filter((student) => student.state === "ABSENT");
        return `ห้อง ${room.code}: มาแล้ว ${arrived.length}/${students.length} · สาย ${late.length} · ยังไม่เข้า ${awaiting.length}${awaiting.length ? `\nยังไม่เข้า: ${awaiting.map((student) => student.name).join(", ")}` : ""}`;
      });
      const message = `สรุปการเข้าโรงเรียน ${date}\n${lines.join("\n\n")}\n\nดูรายละเอียด: https://chumkosoft.com/dashboard/attendance?mode=school&date=${date}`;
      if (!(await pushText(advisor.lineUserId, message))) throw new Error("LINE push failed");
      await redis.set(key, "sent", "EX", 60 * 60 * 36);
      sent += 1;
    } catch {
      await redis.del(key);
      failed += 1;
    }
  }
  return { sent, failed };
}
