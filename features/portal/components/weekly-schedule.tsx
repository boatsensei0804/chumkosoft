"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, MapPin } from "lucide-react";
import type { PortalOverview } from "@/features/portal/types";

/** Read-only weekly class schedule (ตารางเรียน) for the portal viewer. */
export default function WeeklySchedule({ overview }: { overview: PortalOverview }): React.ReactNode {
  const { days, periods } = overview;
  const [day, setDay] = useState(days[0]?.key ?? "MON");
  const [selected, setSelected] = useState<{ subject: string; room: string; teacher: string; time: string; day: string } | null>(null);
  const gridCols = `92px repeat(${days.length}, minmax(120px, 1fr))`;

  return (
    <>
    <section className="rounded-[22px] border border-blue-100 bg-white p-3 md:hidden"><div role="group" aria-label="เลือกวันดูตารางเรียน" className="mb-3 flex flex-wrap gap-1">{days.map((item) => <button key={item.key} type="button" aria-pressed={day === item.key} onClick={() => setDay(item.key)} className={`min-h-11 flex-1 rounded-xl px-2 text-sm font-semibold ${day === item.key ? "bg-brand text-white" : "bg-blue-50 text-muted"}`}>{item.short}</button>)}</div><div className="space-y-2">{periods.map((period) => { const cell = period.cells[day]; return period.isBreak ? <p key={period.periodId} className="rounded-xl bg-slate-100 p-3 text-xs text-muted">{period.label} · {period.start}–{period.end}</p> : <div key={period.periodId} className="flex gap-3 rounded-xl border border-line p-3"><div className="w-20 shrink-0 text-xs text-muted"><p className="font-semibold text-ink">{period.label}</p><p className="mt-1">{period.start}–{period.end}</p></div>{cell ? <button type="button" className="min-h-11 min-w-0 flex-1 text-left" onClick={() => setSelected({ ...cell, time: `${period.start}–${period.end}`, day: days.find((item) => item.key === day)?.label ?? "" })}><p className="text-sm font-semibold text-brand-ink">{cell.subject}</p><p className="mt-1 text-xs text-muted">{cell.teacher} · {cell.room}</p></button> : <p className="text-sm text-muted">ไม่มีคาบเรียน</p>}</div>; })}</div></section>
    <div
      className="hidden overflow-x-auto rounded-[22px] md:block"
      style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)" }}
    >
      <div className="min-w-[720px]">
        {/* Header row: weekdays */}
        <div className="grid" style={{ gridTemplateColumns: gridCols, borderBottom: "1px solid var(--line)" }}>
          <div className="px-3 py-3 text-[12px] font-semibold uppercase tracking-wide text-faint">คาบ</div>
          {days.map((d) => (
            <div
              key={d.key}
              className="px-3 py-3 text-center text-[13px] font-semibold text-ink-strong"
              style={{ backgroundColor: "var(--surface-2)" }}
            >
              {d.label}
            </div>
          ))}
        </div>

        {periods.map((p) =>
          p.isBreak ? (
            <div
              key={p.periodId}
              className="flex items-center justify-center gap-2 py-2.5 text-[12.5px] font-medium text-muted"
              style={{ backgroundColor: "var(--surface-sunken)", borderBottom: "1px solid var(--line)" }}
            >
              <Clock className="size-[15px] text-faint" />
              {p.label} · {p.start}–{p.end}
            </div>
          ) : (
            <div
              key={p.periodId}
              className="grid"
              style={{ gridTemplateColumns: gridCols, borderBottom: "1px solid var(--line)" }}
            >
              <div className="px-3 py-3">
                <p className="text-[13px] font-semibold text-ink-strong">{p.label}</p>
                <p className="tabular text-[11.5px] text-faint">
                  {p.start}–{p.end}
                </p>
              </div>
              {days.map((d) => {
                const cell = p.cells[d.key];
                return (
                  <div key={d.key} className="px-2 py-2" style={{ borderLeft: "1px solid var(--line)" }}>
                    {cell ? (
                      <div
                        className="h-full rounded-[10px] px-2.5 py-2"
                        style={{ backgroundColor: "var(--brand-softer)", border: "1px solid var(--brand-soft)" }}
                      >
                        <button type="button" onClick={() => setSelected({ ...cell, time: `${p.start}–${p.end}`, day: d.label })} className="min-h-10 text-left text-[12.5px] font-semibold leading-snug text-brand-ink hover:underline">{cell.subject}</button>
                        <p className="mt-1 flex items-center gap-1 text-[11.5px] text-muted">
                          <MapPin className="size-[13px]" />
                          {cell.room}
                        </p>
                        <p className="truncate text-[11.5px] text-faint">{cell.teacher}</p>
                      </div>
                    ) : (
                      <div className="grid h-full min-h-[52px] place-items-center text-[13px] text-faint">–</div>
                    )}
                  </div>
                );
              })}
            </div>
          ),
        )}
      </div>
    </div>
    <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}><DialogContent><DialogHeader className="text-left"><DialogTitle>{selected?.subject}</DialogTitle><DialogDescription>{selected?.day} · {selected?.time}</DialogDescription></DialogHeader><dl className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-blue-50 p-4"><dt className="text-xs text-muted">ครูผู้สอน</dt><dd className="mt-2 text-sm font-semibold">{selected?.teacher || "ยังไม่กำหนด"}</dd></div><div className="rounded-xl bg-blue-50 p-4"><dt className="text-xs text-muted">สถานที่เรียน</dt><dd className="mt-2 text-sm font-semibold">{selected?.room || "ยังไม่กำหนด"}</dd></div></dl></DialogContent></Dialog>
    </>
  );
}
