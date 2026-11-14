"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";

type RoomStats = { id: string; code: string; total: number; linked: number; pending: number; unprepared: number };

export default function LineClassroomOverview({ rooms, selectedId }: { rooms: RoomStats[]; selectedId: string }): React.ReactNode {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rooms : rooms.slice(0, 6);
  return <section className="mb-6 rounded-2xl border border-line bg-card p-4 shadow-sm sm:p-5" aria-labelledby="line-room-overview-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="line-room-overview-title" className="text-base font-bold text-ink-strong">ภาพรวมการผูก LINE รายห้อง</h2><p className="mt-1 text-sm text-muted">เลือกห้องเพื่อดูชื่อนักเรียน บัญชี LINE ที่ผูก และรหัสที่รอผู้ปกครองส่ง</p></div>
      <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-ink">{rooms.length.toLocaleString("th-TH")} ห้อง</span>
    </div>
    {rooms.length === 0 ? <p className="mt-4 rounded-xl bg-surface-2 p-4 text-sm text-muted">ยังไม่มีห้องเรียนในปีการศึกษาปัจจุบัน</p> : <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((room) => <Link key={room.id} href={`/dashboard/line?classroom=${encodeURIComponent(room.id)}`} aria-current={selectedId === room.id ? "page" : undefined} className={`group rounded-xl border p-4 transition-colors ${selectedId === room.id ? "border-brand bg-brand-softer" : "border-line bg-bg hover:border-brand/50"}`}>
          <div className="flex items-center justify-between"><h3 className="font-bold text-ink-strong">ห้อง {room.code}</h3><ArrowRight className="size-4 text-brand-ink transition-transform group-hover:translate-x-1" /></div>
          <p className="mt-1 text-xs text-muted">นักเรียน {room.total.toLocaleString("th-TH")} คน</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2" role="meter" aria-label={`สัดส่วนผูก LINE ห้อง ${room.code}`} aria-valuemin={0} aria-valuemax={room.total} aria-valuenow={room.linked}><div className="h-full rounded-full bg-success" style={{ width: `${room.total ? room.linked / room.total * 100 : 0}%` }} /></div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><span className="rounded-lg bg-success-soft px-1 py-2 text-success">ผูกแล้ว <b>{room.linked}</b></span><span className="rounded-lg bg-warning-soft px-1 py-2 text-warning">รอผูก <b>{room.pending}</b></span><span className="rounded-lg bg-surface-2 px-1 py-2 text-muted">ไม่มีรหัส <b>{room.unprepared}</b></span></div>
        </Link>)}
      </div>
      {rooms.length > 6 && <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-brand-ink hover:bg-brand-softer">{expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}{expanded ? "ย่อรายการห้อง" : `ดูทุกห้อง (${rooms.length})`}</button>}
    </>}
  </section>;
}
