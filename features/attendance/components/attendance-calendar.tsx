import Link from "next/link";
import { CalendarDays, CheckCircle2, Circle, CircleAlert, Minus } from "lucide-react";
import type { AttendanceCalendarDay } from "@/features/attendance/types";

interface AttendanceCalendarProps {
  mode: "class" | "school" | "homeroom";
  month: string;
  selectedDate: string;
  days: AttendanceCalendarDay[];
  offeringId?: string;
  classroomId?: string;
}

const WEEKDAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

function monthUrl(month: string, mode: "class" | "school" | "homeroom", selectedDate: string, offeringId?: string, classroomId?: string): string {
  const params = new URLSearchParams();
  if (mode !== "class") params.set("mode", mode);
  if (offeringId) params.set("offering", offeringId);
  if (classroomId) params.set("classroom", classroomId);
  params.set("date", selectedDate);
  params.set("month", month);
  return `/dashboard/attendance?${params.toString()}`;
}

function dateUrl(date: string, mode: "class" | "school" | "homeroom", offeringId?: string, classroomId?: string): string {
  const params = new URLSearchParams();
  if (mode !== "class") params.set("mode", mode);
  if (offeringId) params.set("offering", offeringId);
  if (classroomId) params.set("classroom", classroomId);
  params.set("date", date);
  return `/dashboard/attendance?${params.toString()}`;
}

function dateInMonth(month: string, currentDate: string): string {
  const day = Number(currentDate.slice(8, 10)) || 1;
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return `${month}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

export default function AttendanceCalendar({
  mode,
  month,
  selectedDate,
  days,
  offeringId,
  classroomId,
}: AttendanceCalendarProps): React.ReactNode {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const firstDay = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const prevDate = new Date(Date.UTC(year, monthIndex - 1, 1));
  const nextDate = new Date(Date.UTC(year, monthIndex + 1, 1));
  const prevMonth = prevDate.toISOString().slice(0, 7);
  const nextMonth = nextDate.toISOString().slice(0, 7);
  const dayByDate = new Map(days.map((day) => [day.date, day]));
  const monthLabel = new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, monthIndex, 1)),
  );

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-bg" aria-label="ปฏิทินการเช็คชื่อ">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand-ink" aria-hidden="true">
            <CalendarDays className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink-strong">สรุปการเช็คชื่อรายวัน</h2>
            <p className="text-xs text-muted">{monthLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link href={monthUrl(prevMonth, mode, dateInMonth(prevMonth, selectedDate), offeringId, classroomId)} aria-label="เดือนก่อนหน้า" className="rounded-md px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink-strong">‹</Link>
          <Link href={monthUrl(nextMonth, mode, dateInMonth(nextMonth, selectedDate), offeringId, classroomId)} aria-label="เดือนถัดไป" className="rounded-md px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink-strong">›</Link>
        </div>
      </div>

      <div>
        <div className="w-full">
          <div className="grid grid-cols-7 border-b border-line bg-surface">
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} className="px-2 py-2 text-center text-[11px] font-semibold text-muted sm:text-xs">{weekday}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }, (_, i) => <div key={`blank-${i}`} className="min-h-20 border-b border-r border-line bg-surface/50 sm:min-h-[112px]" aria-hidden="true" />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const number = i + 1;
              const iso = `${yearText}-${monthText}-${String(number).padStart(2, "0")}`;
              const day = dayByDate.get(iso);
              const selected = iso === selectedDate;
              const Icon = day?.state === "complete" ? CheckCircle2 : day?.state === "partial" ? CircleAlert : day?.state === "no-session" ? Minus : Circle;
              const statusColor = day?.state === "complete" ? "text-success" : day?.state === "partial" ? "text-warning" : day?.state === "empty" ? "text-faint" : "text-faint";
              return (
                <Link
                  key={iso}
                  href={dateUrl(iso, mode, offeringId, classroomId)}
                  aria-current={selected ? "date" : undefined}
                  aria-label={`${number} ${monthLabel}${day ? `, บันทึกแล้ว ${day.checked} คน, ยังไม่เช็ค ${day.unchecked} คน, มาสาย ${day.late} คน` : ", ไม่มีคาบเรียน"}`}
                  className={`group min-w-0 min-h-20 border-b border-r border-line p-1 transition-colors hover:bg-brand-softer sm:min-h-[112px] sm:p-2 ${selected ? "bg-brand-soft ring-2 ring-inset ring-brand" : "bg-bg"}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={`grid size-6 place-items-center rounded-full text-xs font-semibold tabular ${selected ? "bg-brand text-white" : "text-ink-strong group-hover:bg-brand-soft"}`}>{number}</span>
                    {day && <Icon className={`hidden size-4 sm:block ${statusColor}`} aria-hidden="true" />}
                  </div>
                  {day?.state === "no-session" ? (
                    <p className="mt-2 text-[9px] leading-tight text-faint sm:mt-3 sm:text-[11px]">{day.total === 0 ? "ไม่มีรายชื่อ" : mode === "class" ? "ไม่มีคาบ" : "วันหยุด"}</p>
                  ) : day ? (
                    <div className="mt-1 space-y-0.5 text-[9px] leading-tight tabular sm:mt-2 sm:text-[11px]">
                      <p className="text-success"><span className="sm:hidden">✓ </span><span className="hidden sm:inline">เช็คแล้ว </span>{day.checked}</p>
                      <p className="text-muted"><span className="sm:hidden">○ </span><span className="hidden sm:inline">ยังไม่เช็ค </span>{day.unchecked}</p>
                      <p className={day.late > 0 ? "font-semibold text-warning" : "text-faint"}><span className="sm:hidden">ส </span><span className="hidden sm:inline">สาย </span>{day.late}</p>
                    </div>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line bg-surface px-4 py-2.5 text-[11px] text-muted sm:px-5">
        <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-success" />ครบแล้ว</span>
        <span className="inline-flex items-center gap-1.5"><CircleAlert className="size-3.5 text-warning" />บันทึกบางส่วน</span>
        <span className="inline-flex items-center gap-1.5"><Circle className="size-3.5 text-faint" />ยังไม่เช็ค</span>
        {mode !== "school" && <span className="inline-flex items-center gap-1.5"><Minus className="size-3.5 text-faint" />{mode === "class" ? "ไม่มีคาบ" : "วันหยุด"}</span>}
        <span className="ml-auto text-faint">เลือกวันที่เพื่อเปิดรายชื่อ</span>
      </div>
    </section>
  );
}
