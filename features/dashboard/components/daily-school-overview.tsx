"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BarChart3, BookOpen, BriefcaseMedical, CalendarDays, CircleHelp, Clock3, GraduationCap, Search, UserRoundCheck, X } from "lucide-react";
import type { DailyClassSummary } from "@/features/attendance/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Mascot from "@/components/ui/mascot";

const metrics = [
  { key: "present", label: "มาเรียน", color: "#16a34a", icon: UserRoundCheck, chip: "bg-emerald-100 text-emerald-700" },
  { key: "late", label: "มาสาย", color: "#e99b07", icon: Clock3, chip: "bg-amber-100 text-amber-700" },
  { key: "absent", label: "ขาดเรียน", color: "#e24957", icon: X, chip: "bg-rose-100 text-rose-700" },
  { key: "sickLeave", label: "ลาป่วย", color: "#7954db", icon: BriefcaseMedical, chip: "bg-violet-100 text-violet-700" },
  { key: "personalLeave", label: "ลากิจ", color: "#1885e3", icon: CalendarDays, chip: "bg-sky-100 text-sky-700" },
  { key: "unchecked", label: "ยังไม่เช็ค", color: "#7189a7", icon: CircleHelp, chip: "bg-slate-100 text-slate-700" },
] as const;
const number = (value: number) => value.toLocaleString("th-TH");

export default function DailySchoolOverview({ rooms, date, scoped }: { rooms: DailyClassSummary[]; date: string; scoped: boolean }): React.ReactNode {
  const [query, setQuery] = useState("");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [selected, setSelected] = useState<DailyClassSummary | null>(null);
  const total = rooms.reduce((sum, room) => sum + room.total, 0);
  const unchecked = rooms.reduce((sum, room) => sum + room.unchecked, 0);
  const checked = Math.max(0, total - unchecked);
  const pct = total ? Math.round(checked / total * 100) : 0;
  const visible = rooms.filter((room) => `${room.classroomCode} ${room.gradeLevel}`.includes(query.trim()) && (!attentionOnly || room.unchecked > 0));
  const rosterUrl = (id: string) => `/dashboard/attendance?mode=homeroom&date=${date}&classroom=${encodeURIComponent(id)}`;

  return <div className="space-y-3">
    <section className="overflow-hidden rounded-[24px] border border-[var(--overview-border)] bg-[var(--overview-card)] shadow-[var(--overview-shadow)]">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--overview-border)] px-4 py-3 sm:px-5">
      <div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e5f3ff] text-[#0875d7]"><BarChart3 className="size-5" aria-hidden="true" /></span><div><p className="text-[11px] font-bold text-[#0869ca]">งานประจำวัน · {scoped ? "ห้องที่คุณเป็นที่ปรึกษา" : "ทุกห้องในภาคเรียนปัจจุบัน"}</p><h2 className="text-lg font-extrabold text-[#0b315f]">ภาพรวมเช็คชื่อประจำห้องวันนี้</h2></div></div>
      <Link href={`/dashboard/attendance?mode=homeroom&date=${date}`} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#b7ddff] bg-[#edf7ff] px-4 text-sm font-bold text-[#075bb0] shadow-sm"><CalendarDays className="size-4" aria-hidden="true" />เปิดปฏิทินเช็คชื่อ</Link>
    </header>
    <div className="grid gap-2.5 p-3 lg:grid-cols-[minmax(200px,1.05fr)_minmax(0,3fr)]">
      <aside className="rounded-[18px] border border-[var(--overview-border)] bg-[var(--overview-tint)] p-3.5">
        <p className="text-xs font-bold text-[#173d70]">ความคืบหน้าการเช็คชื่อ</p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight text-[#076bc8]">{pct}<span className="text-xl">%</span></p>
        <div role="progressbar" aria-label="เช็คชื่อแล้ว" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#c6e3ff]"><div style={{ width: `${pct}%` }} className="h-full rounded-full bg-[#1688e5]" /></div>
        <p className="mt-2 text-xs font-semibold text-[#173d70]">บันทึกแล้ว {number(checked)} จาก {number(total)} คน</p>
        <p className="mt-1 text-[11px] leading-4 text-[#557a9d]">รวมผลสแกนและสถานะที่ครูบันทึก</p>
      </aside>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {metrics.map((metric) => {
          const count = rooms.reduce((sum, room) => sum + room[metric.key], 0);
          return <div key={metric.key} className="min-w-0 rounded-[16px] border border-[var(--overview-border)] bg-linear-to-br from-white to-[var(--overview-tint)] px-3 py-2 shadow-[0_2px_7px_#2c78bd0d]"><p className="flex items-center gap-2 text-xs font-bold text-[#183b68]"><span className={`grid size-7 shrink-0 place-items-center rounded-full ${metric.chip}`}><metric.icon className="size-4" aria-hidden="true" /></span>{metric.label}</p><p className="mt-0.5 pl-9 text-2xl font-extrabold tabular text-[#0b315f]">{number(count)}<span className="ml-1 text-[11px] font-normal text-[#5b7795]">คน</span></p><p className="pl-9 text-[11px] text-[#5b7795]">{total ? (count / total * 100).toFixed(1) : "0.0"}% ของนักเรียนทั้งหมด</p></div>;
        })}
      </div>
    </div>
    </section>
    <section className="overflow-hidden rounded-[24px] border border-[var(--overview-border)] bg-[var(--overview-card)] shadow-[var(--overview-shadow)]">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--overview-border)] px-4 py-2.5 sm:px-5"><div className="flex flex-wrap items-center gap-2"><GraduationCap className="size-5 text-[#0875d7]" aria-hidden="true" /><h3 className="text-sm font-extrabold text-[#0b315f]">ติดตามรายห้อง</h3><button type="button" aria-pressed={attentionOnly} onClick={() => setAttentionOnly(!attentionOnly)} className={`min-h-8 rounded-full border px-3 text-xs font-semibold ${attentionOnly ? "border-[#48a7ee] bg-[#d9eeff] text-[#075bb0]" : "border-[#c9e4ff] bg-white text-[#315a7d]"}`}>ยังเช็คไม่ครบ ({rooms.filter((room) => room.unchecked > 0).length} ห้อง)</button></div><label className="flex min-h-8 items-center gap-2 rounded-full border border-[#c9e4ff] bg-white px-3"><Search className="size-4 text-[#6687aa]" /><input aria-label="ค้นหาห้องในภาพรวมวันนี้" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาห้องเรียน" className="min-w-0 w-40 bg-transparent text-sm outline-none" /></label></div>
    <div className="grid max-h-[176px] gap-2.5 overflow-y-auto bg-[var(--overview-tint)] p-3 sm:grid-cols-2 sm:p-4">{visible.map((room) => {
      const roomPct = room.total ? Math.round((room.total - room.unchecked) / room.total * 100) : 0;
      return <article key={room.classroomId} className="flex min-h-[78px] flex-wrap items-center gap-2 rounded-[16px] border border-[var(--overview-border)] bg-[var(--overview-card)] p-3 shadow-sm">
        <button type="button" onClick={() => setSelected(room)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-[#0875d7]"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#0a9ef0] to-[#0769cb] text-white">{room.total ? <GraduationCap className="size-5" aria-hidden="true" /> : <BookOpen className="size-5" aria-hidden="true" />}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-[#0b315f]">ห้อง {room.classroomCode}</strong><span className="block truncate text-xs text-[#5b7795]">{room.gradeLevel} · {number(room.total)} คน · มา {number(room.present)} สาย {number(room.late)}</span></span><span className="sr-only">บันทึกแล้ว {roomPct}% เปิดรายละเอียด</span>
        </button>
        {room.unchecked > 0 ? (
          <Link href={`${rosterUrl(room.classroomId)}&filter=unchecked#daily-roster`} aria-label={`ดูนักเรียนที่ยังไม่เช็กชื่อห้อง ${room.classroomCode} ${number(room.unchecked)} คน`} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 text-[11px] font-bold text-amber-800 hover:bg-amber-200">
            รอ {number(room.unchecked)} คน <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        ) : <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">{room.total ? "เช็คครบแล้ว" : "ไม่มีนักเรียน"}</span>}
      </article>;
    })}</div>
    {visible.length === 0 && <div className="flex flex-col items-center px-5 pb-8 text-center"><Mascot pose="empty" size={90} decorative /><p className="text-sm text-muted">{rooms.length ? "ไม่มีห้องที่ตรงกับตัวกรอง" : "ยังไม่มีห้องเรียนในขอบเขตนี้ กรุณาตรวจภาคเรียนและห้องที่ปรึกษา"}</p></div>}
    </section>
    <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>สรุปห้อง {selected?.classroomCode}</DialogTitle><DialogDescription>ผลเช็คชื่อประจำห้อง วันที่ {new Date(`${date}T00:00:00+07:00`).toLocaleDateString("th-TH", { dateStyle: "long", timeZone: "Asia/Bangkok" })}</DialogDescription></DialogHeader>{selected && <><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{metrics.map((metric) => <div key={metric.key} className="rounded-2xl bg-surface p-4"><p className="text-xs text-muted">{metric.label}</p><p className="mt-2 text-2xl font-bold">{selected[metric.key]} <span className="text-xs font-normal text-muted">คน</span></p><p className="mt-1 text-xs text-muted">{selected.total ? (selected[metric.key] / selected.total * 100).toFixed(1) : "0"}%</p></div>)}</div><Link href={rosterUrl(selected.classroomId)} className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white">เปิดรายชื่อนักเรียนและแก้ไขสถานะ <ArrowUpRight className="size-4" /></Link></>}</DialogContent></Dialog>
  </div>;
}
