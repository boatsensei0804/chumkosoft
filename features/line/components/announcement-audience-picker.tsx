"use client";

import { useState } from "react";
import type { AnnouncementAudience, AudienceOptions } from "@/features/line/announcement-audience";

export default function AnnouncementAudiencePicker({ options, value, onChange, disabled }: { options: AudienceOptions; value: AnnouncementAudience; onChange: (value: AnnouncementAudience) => void; disabled: boolean }): React.ReactNode {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const selected = new Set("ids" in value ? value.ids : []);
  const rows = value.mode === "classrooms" ? options.classrooms : options.people.filter((person) => (kind === "all" || person.kind === kind) && person.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  function toggle(id: string): void {
    if (value.mode !== "classrooms" && value.mode !== "people") return;
    const next = new Set(value.ids); if (next.has(id)) next.delete(id); else next.add(id);
    onChange({ mode: value.mode, ids: [...next] });
  }
  return <fieldset disabled={disabled} className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/40 p-4"><legend className="px-1 text-sm font-bold text-ink">เลือกผู้รับประกาศ</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[{ mode: "all" as const, label: "ทั้งหมด" }, { mode: "classrooms" as const, label: "รายห้อง" }, { mode: "people" as const, label: "รายบุคคล" }, { mode: "staff" as const, label: "ครู/บุคลากร" }].map((option) => <button key={option.mode} type="button" aria-pressed={value.mode === option.mode} onClick={() => { if (value.mode === option.mode) return; onChange(option.mode === "all" || option.mode === "staff" ? { mode: option.mode } : { mode: option.mode, ids: [] }); }} className={`min-h-11 rounded-xl border px-2 text-xs font-semibold ${value.mode === option.mode ? "border-brand bg-brand text-white" : "border-line bg-white text-muted"}`}>{option.label}</button>)}</div>
    {value.mode === "classrooms" && <p className="mt-3 text-xs leading-6 text-muted">ส่งถึงผู้ปกครองของนักเรียนในห้องที่เลือก เฉพาะภาคเรียนปัจจุบัน ไม่รวมครูในห้อง</p>}
    {value.mode === "all" && <p className="mt-3 text-xs leading-6 text-muted">ผู้ปกครองและครู/บุคลากรทั้งหมดที่ผูก LINE ในระบบ</p>}
    {value.mode === "staff" && <p className="mt-3 text-xs leading-6 text-muted">เฉพาะครูและบุคลากรที่ผูก LINE แล้ว</p>}
    {value.mode === "people" && <div className="mt-3 flex flex-wrap gap-2"><input aria-label="ค้นหาผู้รับประกาศ" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ชื่อผู้ปกครอง นักเรียน รหัส หรือครู" className="min-h-10 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-sm" /><select aria-label="ประเภทผู้รับ" value={kind} onChange={(event) => setKind(event.target.value)} className="rounded-xl border border-line bg-white px-3 text-sm"><option value="all">ทุกประเภท</option><option value="parent">ผู้ปกครอง</option><option value="staff">ครู/บุคลากร</option></select></div>}
    {(value.mode === "people" || value.mode === "classrooms") && <><p className="mt-3 text-xs font-semibold text-brand-ink">เลือกแล้ว {selected.size} รายการ · จำนวนบัญชีจริงจะแสดงในขั้นตรวจสอบก่อนส่ง</p><div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-line bg-white p-2">{rows.map((row) => <label key={row.id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg px-2 py-3 text-sm hover:bg-blue-50"><input type="checkbox" checked={selected.has(row.id)} onChange={() => toggle(row.id)} className="mt-1 size-4 shrink-0 accent-blue-600" /><span>{row.label}</span></label>)}{rows.length === 0 && <p className="p-4 text-sm text-muted">ไม่พบรายการที่เลือกได้</p>}</div>{selected.size > 0 && <button type="button" onClick={() => onChange({ mode: value.mode as "classrooms" | "people", ids: [] })} className="mt-2 min-h-9 text-xs font-semibold text-brand-ink">ล้างที่เลือกทั้งหมด</button>}</>}
  </fieldset>;
}
