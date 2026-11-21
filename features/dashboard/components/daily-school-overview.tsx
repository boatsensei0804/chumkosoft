"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import type { DailyClassSummary } from "@/features/attendance/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Mascot from "@/components/ui/mascot";

const metrics = [
  { key: "present", label: "มาเรียน", color: "#16a085" },
  { key: "late", label: "มาสาย", color: "#d68b12" },
  { key: "absent", label: "ขาดเรียน", color: "#dc5267" },
  { key: "sickLeave", label: "ลาป่วย", color: "#7480c4" },
  { key: "personalLeave", label: "ลากิจ", color: "#5f91b4" },
  { key: "unchecked", label: "ยังไม่เช็ค", color: "#9aaec3" },
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

  return <section className="overflow-hidden rounded-[26px] border border-blue-100 bg-white shadow-[0_8px_32px_#24568208]">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 px-4 py-3 sm:px-5">
      <div><p className="text-[11px] font-semibold text-brand">งานประจำวัน · {scoped ? "ห้องที่คุณเป็นที่ปรึกษา" : "ทุกห้องในภาคเรียนปัจจุบัน"}</p><h2 className="mt-0.5 text-lg font-bold text-ink-strong">ภาพรวมเช็คชื่อประจำห้องวันนี้</h2></div>
      <Link href={`/dashboard/attendance?mode=homeroom&date=${date}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-soft px-4 text-sm font-semibold text-brand-ink">เปิดปฏิทินเช็คชื่อ <ArrowUpRight className="size-4" /></Link>
    </header>
    <div className="grid gap-2.5 bg-[#f6fbff] p-3 lg:grid-cols-[minmax(190px,1.05fr)_minmax(0,3fr)]">
      <aside className="rounded-[18px] border border-[#d5e9fb] bg-gradient-to-br from-[#e9f5ff] to-white p-3.5">
        <p className="text-xs font-semibold text-ink">ความคืบหน้าการเช็คชื่อ</p>
        <p className="mt-1 text-4xl font-bold tracking-tight text-brand-ink">{pct}<span className="text-xl">%</span></p>
        <div role="progressbar" aria-label="เช็คชื่อแล้ว" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100"><div style={{ width: `${pct}%` }} className="h-full rounded-full bg-brand" /></div>
        <p className="mt-2 text-xs text-muted">บันทึกแล้ว {number(checked)} จาก {number(total)} คน</p>
        <p className="mt-1 text-[11px] leading-4 text-muted">รวมผลสแกนและสถานะที่ครูบันทึก</p>
      </aside>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {metrics.map((metric) => {
          const count = rooms.reduce((sum, room) => sum + room[metric.key], 0);
          return <div key={metric.key} className="min-w-0 rounded-[16px] border border-[#d8e9f8] bg-white px-3 py-2 shadow-[0_2px_6px_#225a9a08]"><p className="flex items-center gap-2 text-xs text-muted"><span className="size-2 rounded-full" style={{ backgroundColor: metric.color }} />{metric.label}</p><p className="mt-1 text-2xl font-bold tabular text-ink-strong">{number(count)}<span className="ml-1 text-[11px] font-normal text-muted">คน</span></p><p className="text-[11px] text-muted">{total ? (count / total * 100).toFixed(1) : "0.0"}% ของนักเรียนทั้งหมด</p></div>;
        })}
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-y border-blue-100 bg-white px-4 py-2 sm:px-5"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold">ติดตามรายห้อง</h3><button type="button" aria-pressed={attentionOnly} onClick={() => setAttentionOnly(!attentionOnly)} className={`min-h-8 rounded-full border px-3 text-xs font-semibold ${attentionOnly ? "border-brand bg-brand-soft text-brand-ink" : "border-line bg-white text-muted"}`}>ยังเช็คไม่ครบ ({rooms.filter((room) => room.unchecked > 0).length} ห้อง)</button></div><label className="flex min-h-8 items-center gap-2 rounded-xl border border-line bg-white px-3"><Search className="size-4 text-muted" /><input aria-label="ค้นหาห้องในภาพรวมวันนี้" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาห้องเรียน" className="min-w-0 w-40 bg-transparent text-sm outline-none" /></label></div>
    <div className="grid max-h-[188px] gap-2 overflow-y-auto p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">{visible.map((room) => {
      const roomPct = room.total ? Math.round((room.total - room.unchecked) / room.total * 100) : 0;
      return <button key={room.classroomId} type="button" onClick={() => setSelected(room)} className="rounded-2xl border border-[#d7e9fa] bg-white p-3 text-left shadow-[0_3px_10px_#225a9a0b] transition hover:border-brand hover:shadow-md focus-visible:outline-2 focus-visible:outline-brand"><div className="flex justify-between gap-2"><div><h4 className="font-bold text-ink-strong">ห้อง {room.classroomCode}</h4><p className="mt-0.5 text-xs text-muted">{room.gradeLevel} · {number(room.total)} คน</p></div><span className={`h-fit rounded-full px-2 py-1 text-[11px] font-semibold ${room.unchecked ? "bg-warning-soft text-warning" : "bg-success-soft text-success"}`}>{room.unchecked ? `รอ ${room.unchecked} คน` : room.total ? "ครบแล้ว" : "ไม่มีนักเรียน"}</span></div><div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-slate-100">{metrics.map((metric) => <span key={metric.key} style={{ width: `${room.total ? room[metric.key] / room.total * 100 : 0}%`, backgroundColor: metric.color }} />)}</div><div className="mt-2 flex justify-between gap-2 text-xs"><span className="text-muted">มา {room.present} · สาย {room.late} · ขาด {room.absent}</span><span className="font-semibold text-brand-ink">{roomPct}% <ArrowUpRight className="inline size-3" /></span></div></button>;
    })}</div>
    {visible.length === 0 && <div className="flex flex-col items-center px-5 pb-8 text-center"><Mascot pose="empty" size={90} decorative /><p className="text-sm text-muted">{rooms.length ? "ไม่มีห้องที่ตรงกับตัวกรอง" : "ยังไม่มีห้องเรียนในขอบเขตนี้ กรุณาตรวจภาคเรียนและห้องที่ปรึกษา"}</p></div>}
    <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>สรุปห้อง {selected?.classroomCode}</DialogTitle><DialogDescription>ผลเช็คชื่อประจำห้อง วันที่ {new Date(`${date}T00:00:00+07:00`).toLocaleDateString("th-TH", { dateStyle: "long", timeZone: "Asia/Bangkok" })}</DialogDescription></DialogHeader>{selected && <><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{metrics.map((metric) => <div key={metric.key} className="rounded-2xl bg-surface p-4"><p className="text-xs text-muted">{metric.label}</p><p className="mt-2 text-2xl font-bold">{selected[metric.key]} <span className="text-xs font-normal text-muted">คน</span></p><p className="mt-1 text-xs text-muted">{selected.total ? (selected[metric.key] / selected.total * 100).toFixed(1) : "0"}%</p></div>)}</div><Link href={rosterUrl(selected.classroomId)} className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white">เปิดรายชื่อนักเรียนและแก้ไขสถานะ <ArrowUpRight className="size-4" /></Link></>}</DialogContent></Dialog>
  </section>;
}
