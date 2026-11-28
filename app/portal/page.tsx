import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";
import { CalendarDays, LogIn, LogOut } from "lucide-react";
import WeeklySchedule from "@/features/portal/components/weekly-schedule";
import { getCurrentUser } from "@/lib/dal";
import { getPortalOverview } from "@/features/portal/services/portal-service";
import { formatBangkokTime, formatThaiWeekdayLong, thaiGreeting } from "@/utils/thai-date";
import PageHeader from "@/features/dashboard/components/page-header";
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

  const heading = user.firstName ? `${thaiGreeting(now)} คุณ${user.firstName}` : thaiGreeting(now);
  const roleNote =
    user.role === "PARENT" && overview.studentName ? `ตารางเรียนของ ${overview.studentName}` : "ตารางเรียนของฉัน";

  return (
    <>
      <PageHeader title={heading} subtitle={formatThaiWeekdayLong(now)} pose="family"
        actions={overview.classroomCode && <>
          <Button asChild variant={user.role === "PARENT" ? "outline" : "default"}><a href="#weekly-schedule">ตารางเรียน</a></Button>
          <Button asChild variant={user.role === "PARENT" ? "default" : "outline"}><a href="#school-entry">เข้า–ออกวันนี้</a></Button>
        </>}
      />
      <div className="flex flex-col gap-4">
        {user.role === "PARENT" && options.length > 0 && (options.length > 1 || unavailable) && (
          <nav aria-label="เลือกนักเรียน" className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-card p-3">
            <span className="mr-1 text-sm font-semibold text-ink-strong">เลือกนักเรียน</span>
            {options.map((option) => (
              <Link key={option.id} href={`/portal?student=${encodeURIComponent(option.id)}`} aria-current={selectedId === option.id ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold ${selectedId === option.id ? "bg-brand text-white" : "bg-surface-2 text-brand-ink hover:bg-brand-soft"}`}>
                {option.name}
              </Link>
            ))}
          </nav>
        )}
        {unavailable && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">เปิดข้อมูลนักเรียนที่เลือกไม่ได้ กรุณาเลือกรายชื่อที่เชื่อมกับบัญชีนี้</p>}
        <div className={overview.studentName && !unavailable ? "grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]" : "grid gap-4"}>
          {overview.studentName && (
            <section id="school-entry" aria-labelledby="school-entry-title" tabIndex={-1} className="scroll-mt-20 rounded-2xl border border-line bg-card p-4 shadow-school-panel sm:p-5">
              <h2 id="school-entry-title" className="wrap-anywhere text-lg font-bold text-ink-strong">{overview.studentName}</h2>
              <p className="mt-1 text-sm text-muted">
                {[overview.classroomCode && "ห้อง " + overview.classroomCode, overview.gradeLevel, overview.termLabel].filter(Boolean).join(" · ")}
              </p>
              {overview.classroomCode && (
                <dl className="mt-4 grid grid-cols-1 gap-2 border-t border-line pt-4 text-sm min-[380px]:grid-cols-2">
                  <div className="rounded-xl bg-brand-softer p-3"><dt className="flex items-center gap-2 font-medium text-brand-ink"><LogIn aria-hidden="true" className="size-4 shrink-0" /> เข้าโรงเรียนวันนี้</dt><dd className="mt-2 font-semibold tabular-nums text-ink-strong">
                    {entry?.checkInAt ? formatBangkokTime(entry.checkInAt) + " น." : "ยังไม่มีบันทึก"}
                    {entry?.checkInAt && entry.isLate && <span className="ml-2 text-xs text-amber-800">มาสาย</span>}
                  </dd></div>
                  <div className="rounded-xl bg-surface p-3"><dt className="flex items-center gap-2 font-medium text-muted"><LogOut aria-hidden="true" className="size-4 shrink-0" /> ออกจากโรงเรียน</dt><dd className="mt-2 font-semibold tabular-nums text-ink-strong">
                    {entry?.checkOutAt ? formatBangkokTime(entry.checkOutAt) + " น." : "ยังไม่มีบันทึก"}
                  </dd></div>
                </dl>
              )}
            </section>
          )}
          {(!unavailable || !options.length) && <section id="weekly-schedule" tabIndex={-1} className="flex scroll-mt-20 flex-col gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays aria-hidden="true" className="size-5 text-brand-strong" />
              <h2 className="text-[16px] font-bold text-ink-strong">{roleNote}</h2>
            </div>

            {overview.hasSchedule ? (
              <WeeklySchedule key={selectedId} overview={overview} initialDay={weekday} />
            ) : (
              <EmptyState studentResolved={overview.studentName !== null} />
            )}
          </section>}
        </div>
      </div>
    </>
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
