"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BriefcaseMedical, CalendarDays, CircleHelp, Clock3, Search, UserRoundCheck, X } from "lucide-react";
import type { DailyClassSummary } from "@/features/attendance/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const metrics = [
  { key: "present", filter: "PRESENT", label: "มาตรงเวลา", icon: UserRoundCheck, chip: "bg-emerald-100 text-emerald-700" },
  { key: "late", filter: "LATE", label: "มาสาย", icon: Clock3, chip: "bg-amber-100 text-amber-700" },
  { key: "absent", filter: "ABSENT", label: "ขาดเรียน", icon: X, chip: "bg-rose-100 text-rose-700" },
  { key: "sickLeave", filter: "SICK_LEAVE", label: "ลาป่วย", icon: BriefcaseMedical, chip: "bg-violet-100 text-violet-700" },
  { key: "personalLeave", filter: "PERSONAL_LEAVE", label: "ลากิจ", icon: CalendarDays, chip: "bg-sky-100 text-sky-700" },
  { key: "unchecked", filter: "unchecked", label: "ยังไม่เช็ก", icon: CircleHelp, chip: "bg-slate-100 text-slate-700" },
] as const;
const number = (value: number) => value.toLocaleString("th-TH");

export default function DailySchoolOverview({ rooms, date, scoped }: { rooms: DailyClassSummary[]; date: string; scoped: boolean }): React.ReactNode {
  const [query, setQuery] = useState("");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [selected, setSelected] = useState<DailyClassSummary | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<(typeof metrics)[number] | null>(null);
  const metricTrigger = useRef<HTMLButtonElement>(null);
  const total = rooms.reduce((sum, room) => sum + room.total, 0);
  const unchecked = rooms.reduce((sum, room) => sum + room.unchecked, 0);
  const checked = Math.max(0, total - unchecked);
  const pct = total ? Math.round(checked / total * 100) : 0;
  const visible = rooms.filter((room) => `${room.classroomCode} ${room.gradeLevel}`.includes(query.trim()) && (!attentionOnly || room.unchecked > 0));
  const rosterUrl = (id: string) => `/dashboard/attendance?mode=homeroom&date=${date}&classroom=${encodeURIComponent(id)}`;

  return <div className="space-y-5">
    <section aria-labelledby="daily-attendance-heading" className="overflow-hidden rounded-xl border border-line bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <div>
          <h2 id="daily-attendance-heading" className="text-lg font-bold text-ink-strong">เช็คชื่อประจำห้องวันนี้</h2>
          <p className="mt-0.5 text-sm text-muted">{scoped ? "ห้องที่คุณเป็นที่ปรึกษา" : "ทุกห้องในภาคเรียนปัจจุบัน"}</p>
        </div>
        {scoped && <Button asChild variant="outline">
          <Link href={`/dashboard/attendance?mode=homeroom&date=${date}`}>
            <CalendarDays aria-hidden="true" /> ปฏิทินเช็คชื่อ
          </Link>
        </Button>}
      </header>

      <div className="border-y border-line bg-surface px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-sm text-ink">เช็คชื่อแล้ว <strong className="tabular-nums text-ink-strong">{number(checked)} / {number(total)}</strong> คน</p>
          <span className="text-sm font-semibold tabular-nums text-brand-ink">{total ? `${pct}%` : "—"}</span>
        </div>
        {total > 0 && (
          <div role="progressbar" aria-label="เช็คชื่อแล้ว" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-2 overflow-hidden rounded-full bg-school-panel-wash">
            <div style={{ width: `${pct}%` }} className="h-full rounded-full bg-brand" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-px bg-line min-[375px]:grid-cols-3 2xl:grid-cols-6">
        {metrics.map((metric) => {
          const count = rooms.reduce((sum, room) => sum + room[metric.key], 0);
          return (
            <button key={metric.key} type="button" aria-haspopup="dialog"
              onClick={(event) => {
                metricTrigger.current = event.currentTarget;
                setSelectedMetric(metric);
              }}
              className="group min-w-0 bg-card p-2.5 text-left transition-colors hover:bg-brand-soft focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand sm:p-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-ink sm:gap-2">
                <span className={`grid size-6 shrink-0 place-items-center rounded-md ${metric.chip}`}>
                  <metric.icon className="size-3.5" aria-hidden="true" />
                </span>
                {metric.label}
              </span>
              <span className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold tabular-nums text-ink-strong">{number(count)}</span>
                <span className="text-xs text-muted">คน</span>
                <ArrowUpRight className="ml-auto size-3.5 shrink-0 self-center text-muted group-hover:text-brand" aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </div>
    </section>

    <section aria-labelledby="classroom-tracking-heading" className="overflow-hidden rounded-xl border border-line bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <h2 id="classroom-tracking-heading" className="text-base font-bold text-ink-strong">ติดตามรายห้อง</h2>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Button type="button" variant={attentionOnly ? "secondary" : "outline"} aria-pressed={attentionOnly} onClick={() => setAttentionOnly(!attentionOnly)} className="h-10">
            ยังเช็คไม่ครบ ({rooms.filter((room) => room.unchecked > 0).length})
          </Button>
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-card px-2.5 focus-within:ring-2 focus-within:ring-brand sm:w-40">
            <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
            <input aria-label="ค้นหาห้องในภาพรวมวันนี้" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาห้องเรียน" className="w-full min-w-0 bg-transparent text-sm outline-none" />
          </label>
        </div>
      </header>

      {visible.length ? (
        <ul className="max-h-72 divide-y divide-line overflow-y-auto">
          {visible.map((room) => {
            const roomPct = room.total ? Math.round((room.total - room.unchecked) / room.total * 100) : 0;
            return (
              <li key={room.classroomId} className="flex items-center gap-2 px-4 py-1 sm:px-5">
                <button type="button" aria-haspopup="dialog" onClick={() => setSelected(room)} className="min-w-0 flex-1 rounded-md py-2 text-left hover:text-brand focus-visible:outline-2 focus-visible:outline-brand">
                  <span className="block text-sm font-semibold">ห้อง {room.classroomCode}</span>
                  <span className="block text-xs text-muted">{room.gradeLevel} · {number(room.total)} คน · มา {number(room.present)} สาย {number(room.late)}</span>
                  <span className="sr-only">บันทึกแล้ว {roomPct}% เปิดรายละเอียด</span>
                </button>
                {room.unchecked > 0 ? (
                  <Link href={`${rosterUrl(room.classroomId)}&filter=unchecked#daily-roster`} aria-label={`ดูนักเรียนที่ยังไม่เช็กชื่อห้อง ${room.classroomCode} ${number(room.unchecked)} คน`} className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-semibold text-amber-900 hover:bg-amber-50">
                    รอ {number(room.unchecked)} คน <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </Link>
                ) : <span className={room.total ? "shrink-0 text-xs font-semibold text-emerald-800" : "shrink-0 text-xs text-muted"}>{room.total ? "เช็คครบแล้ว" : "ไม่มีนักเรียน"}</span>}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-4 py-6 text-sm text-muted sm:px-5">
          {rooms.length ? "ไม่มีห้องที่ตรงกับตัวกรอง" : "ยังไม่มีห้องเรียนในขอบเขตนี้ กรุณาตรวจภาคเรียนและห้องที่ปรึกษา"}
        </p>
      )}
    </section>
    <Dialog open={selectedMetric !== null} onOpenChange={(open) => { if (!open) setSelectedMetric(null); }}>
      {selectedMetric && <DialogContent className="sm:max-w-lg" onCloseAutoFocus={(event) => {
        if (!metricTrigger.current?.isConnected) return;
        event.preventDefault();
        metricTrigger.current.focus();
      }}>
        <DialogHeader>
          <DialogTitle>{selectedMetric.label} · แยกตามห้อง</DialogTitle>
          <DialogDescription>
            {number(rooms.reduce((sum, room) => sum + room[selectedMetric.key], 0))} จาก {number(total)} คน
            {' · '}{scoped ? "ห้องที่คุณเป็นที่ปรึกษา" : "ทุกห้องในภาคเรียนปัจจุบัน"}
            {' · '}{new Date(`${date}T00:00:00+07:00`).toLocaleDateString("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" })}
          </DialogDescription>
        </DialogHeader>
        {rooms.some((room) => room[selectedMetric.key] > 0) ? (
          <ul className="max-h-[50dvh] divide-y divide-line overflow-y-auto">
            {rooms.filter((room) => room[selectedMetric.key] > 0).sort((a, b) => b[selectedMetric.key] - a[selectedMetric.key]).map((room) => (
              <li key={room.classroomId}>
                <Link href={`${rosterUrl(room.classroomId)}&filter=${selectedMetric.filter}#daily-roster`}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-school-panel-tint">
                  <span className="text-sm font-semibold text-brand-ink">ห้อง {room.classroomCode}</span>
                  <span className="inline-flex items-center gap-2 text-sm text-ink">{number(room[selectedMetric.key])} คน <ArrowUpRight className="size-3.5" aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="rounded-xl bg-school-panel-tint p-4 text-sm text-muted">ไม่มีนักเรียนในสถานะนี้</p>}
      </DialogContent>}
    </Dialog>
    <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>สรุปห้อง {selected?.classroomCode}</DialogTitle><DialogDescription>ผลเช็คชื่อประจำห้อง วันที่ {new Date(`${date}T00:00:00+07:00`).toLocaleDateString("th-TH", { dateStyle: "long", timeZone: "Asia/Bangkok" })}</DialogDescription></DialogHeader>{selected && <><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{metrics.map((metric) => <div key={metric.key} className="rounded-2xl bg-surface p-4"><p className="text-xs text-muted">{metric.label}</p><p className="mt-2 text-2xl font-bold">{selected[metric.key]} <span className="text-xs font-normal text-muted">คน</span></p><p className="mt-1 text-xs text-muted">{selected.total ? (selected[metric.key] / selected.total * 100).toFixed(1) : "0"}%</p></div>)}</div><Link href={rosterUrl(selected.classroomId)} className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white">เปิดรายชื่อนักเรียนและแก้ไขสถานะ <ArrowUpRight className="size-4" /></Link></>}</DialogContent></Dialog>
  </div>;
}
