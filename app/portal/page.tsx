import Link from "next/link";
import StatStrip from "@/components/ui/stat-strip";
import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import WeeklySchedule from "@/features/portal/components/weekly-schedule";
import { getCurrentUser } from "@/lib/dal";
import { getPortalOverview } from "@/features/portal/services/portal-service";
import { thaiGreeting, formatThaiWeekdayLong } from "@/utils/thai-date";
import MascotBanner from "@/features/dashboard/components/mascot-banner";
import MascotEmptyState from "@/components/ui/mascot-empty-state";

export const metadata: Metadata = {
  title: "หน้าของฉัน — chumkosoft",
};

export const dynamic = "force-dynamic";

export default async function PortalPage({ searchParams }: { searchParams: Promise<{ student?: string }> }): Promise<React.ReactNode> {
  const now = new Date();
  const user = await getCurrentUser();
  const { student } = await searchParams;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(now);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", weekday: "short" }).format(now).toUpperCase();
  const { overview, options, selectedId, entry, unavailable } = await getPortalOverview(user.id, user.role, today, student);
  const time = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false });

  const heading = user.firstName ? `${thaiGreeting(now)} คุณ${user.firstName}` : thaiGreeting(now);
  const roleNote =
    user.role === "PARENT" && overview.studentName ? `ตารางเรียนของ ${overview.studentName}` : "ตารางเรียนของฉัน";

  return (
    <div className="flex flex-col gap-6">
      <MascotBanner title={heading} category={user.role === "PARENT" ? "พื้นที่ของผู้ปกครอง" : "พื้นที่ของนักเรียน"} pose={user.role === "PARENT" ? "family" : "students"} scene={user.role === "PARENT" ? "/mascot/guardians-banner.webp" : "/mascot/overview-scene.webp"} subtitle={[formatThaiWeekdayLong(now), overview.classroomCode ? `ชั้น ${overview.classroomCode} · ${overview.gradeLevel}` : null, overview.termLabel].filter(Boolean).join(" · ")} />

      {user.role === "PARENT" && options.length > 0 && (options.length > 1 || unavailable) && (
        <nav aria-label="เลือกนักเรียน" className="flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-white p-3">
          <span className="mr-1 text-sm font-semibold text-ink-strong">เลือกนักเรียน</span>
          {options.map((option) => (
            <Link key={option.id} href={`/portal?student=${encodeURIComponent(option.id)}`} aria-current={selectedId === option.id ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold ${selectedId === option.id ? "bg-brand text-white" : "bg-blue-50 text-brand-ink"}`}>
              {option.name}
            </Link>
          ))}
        </nav>
      )}
      {unavailable && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">เปิดข้อมูลนักเรียนที่เลือกไม่ได้ กรุณาเลือกรายชื่อที่เชื่อมกับบัญชีนี้</p>}
      {overview.studentName && <>
      <StatStrip items={[
        { label: "นักเรียน", value: overview.studentName ?? "ยังไม่ได้เชื่อมข้อมูล", tone: "brand" },
        { label: "ห้องเรียน", value: overview.classroomCode ?? "ยังไม่กำหนด" },
        { label: "ภาคเรียน", value: overview.termLabel ?? "ยังไม่กำหนด" },
      ]} />
      {overview.classroomCode && (
        <section className="rounded-2xl border border-blue-100 bg-white p-4">
          <h2 className="font-bold text-ink-strong">เข้า–ออกโรงเรียนวันนี้ · {overview.studentName}</h2>
          <p className="mt-1 text-sm text-muted">{entry?.checkInAt ? `เข้า ${time.format(entry.checkInAt)} น.${entry.isLate ? " · มาสาย" : ""}` : "ยังไม่พบเวลาเข้าโรงเรียน"}{entry?.checkOutAt ? ` · ออก ${time.format(entry.checkOutAt)} น.` : ""}</p>
        </section>
      )}
      </>}
      {(!unavailable || !options.length) && <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5 text-brand-strong" />
          <h2 className="text-[16px] font-bold text-ink-strong">{roleNote}</h2>
        </div>

        {overview.hasSchedule ? (
          <WeeklySchedule key={selectedId} overview={overview} initialDay={weekday} />
        ) : (
          <EmptyState studentResolved={overview.studentName !== null} />
        )}
      </section>}
    </div>
  );
}

function EmptyState({ studentResolved }: { studentResolved: boolean }): React.ReactNode {
  return (
    <MascotEmptyState
      title="ยังไม่มีตารางเรียน"
      description={studentResolved
        ? "ยังไม่มีการจัดชั้นเรียนหรือตารางเรียนในภาคเรียนปัจจุบัน กรุณาติดต่อเจ้าหน้าที่ทะเบียน"
        : "ยังไม่มีข้อมูลนักเรียนที่เชื่อมกับบัญชีนี้ กรุณาติดต่อเจ้าหน้าที่ทะเบียน"}
    />
  );
}
