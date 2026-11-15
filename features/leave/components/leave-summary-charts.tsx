"use client";

import { useId } from "react";
import { requestKindLabel } from "@/features/leave/request-kind";
import type { LeaveKind, summarizeDailyLeave } from "@/features/leave/daily-report";

type Summary = ReturnType<typeof summarizeDailyLeave>;
const KIND_COLORS: Record<LeaveKind, string> = { SICK: "#2580d5", PERSONAL: "#7165c8", LATE: "#c77a0a" };
const STATUSES = [
  { key: "PENDING", label: "รอพิจารณา", color: "#c77a0a" },
  { key: "APPROVED", label: "อนุมัติแล้ว", color: "#14866a" },
  { key: "REJECTED", label: "ไม่อนุมัติ", color: "#c54b58" },
] as const;
const number = (value: number) => value.toLocaleString("th-TH");
const percentage = (value: number | null) => value === null ? "—" : `${value.toLocaleString("th-TH", { maximumFractionDigits: 1 })}%`;

export default function LeaveSummaryCharts({ summary, totalStudents, selectedKind, onSelectKind }: {
  summary: Summary; totalStudents: number; selectedKind: LeaveKind | "ALL"; onSelectKind: (kind: LeaveKind) => void;
}): React.ReactNode {
  const id = useId();
  const portion = totalStudents > 0 ? Math.min(100, Math.max(0, summary.students / totalStudents * 100)) : 0;
  // Scale counts to readable ticks; percentages always use the school denominator.
  const step = Math.max(1, Math.ceil(Math.max(...summary.kinds.map(row => row.students)) / 4));
  const maximum = step * 4;

  return <div className="space-y-4" data-leave-summary-charts>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <figure aria-labelledby={`${id}-overall`} className="min-w-0 rounded-xl border border-line bg-surface p-4 sm:p-5">
        <figcaption id={`${id}-overall`} className="font-semibold text-ink-strong">นักเรียนที่มีคำขอ</figcaption>
        <p className="mt-1 text-xs text-muted">รอพิจารณาหรืออนุมัติ · นับคนไม่ซ้ำ</p>
        <div className="relative mx-auto my-3 h-44 w-44">
          <svg aria-hidden="true" viewBox="0 0 42 42" className="h-full w-full -rotate-90">
            <circle cx="21" cy="21" r="15.9154943" fill="none" stroke="var(--color-line, #dce7f2)" strokeWidth="5" />
            <circle cx="21" cy="21" r="15.9154943" fill="none" stroke="#2580d5" strokeWidth="5" strokeDasharray={`${portion} ${100 - portion}`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center"><strong className="text-3xl tabular-nums text-brand-ink">{percentage(summary.percentage)}</strong><span className="mt-1 text-sm font-semibold text-ink">{number(summary.students)} คน</span></div>
        </div>
        <p className="text-center text-sm text-muted">จากนักเรียนทั้งโรงเรียน <strong className="text-ink-strong">{number(totalStudents)}</strong> คน</p>
        <p className="mt-2 text-center text-xs text-muted">แสดงคำขอของวันที่เลือก ไม่ใช่ผลมาเรียนหรือขาดเรียน</p>
      </figure>

      <figure aria-labelledby={`${id}-kinds`} className="min-w-0 rounded-xl border border-line bg-surface p-4 sm:p-5">
        <figcaption id={`${id}-kinds`} className="font-semibold text-ink-strong">เปรียบเทียบตามประเภทคำขอ</figcaption>
        <p className="mt-1 text-xs text-muted">ความยาวแท่งแสดงจำนวนนักเรียน · กดประเภทเพื่อกรองรายการด้านล่าง</p>
        <div className="mt-5 space-y-3">{summary.kinds.map(row => <button key={row.kind} type="button" onClick={() => onSelectKind(row.kind)} aria-pressed={selectedKind === row.kind} aria-label={`ดูรายชื่อ${requestKindLabel(row.kind)} ${number(row.students)} คน ${percentage(row.percentage)} ของนักเรียนทั้งหมด`} className={`block w-full rounded-lg border p-3 text-left transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${selectedKind === row.kind ? "border-brand bg-brand-soft" : "border-transparent"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-semibold text-ink-strong">{requestKindLabel(row.kind)}</span><span className="font-bold tabular-nums text-ink-strong">{number(row.students)} คน <span className="font-normal text-muted">· {percentage(row.percentage)}</span></span></div>
          <div aria-hidden="true" className="relative mt-2 h-4 overflow-hidden rounded bg-surface-2"><div className="h-full rounded" style={{ width: `${row.students / maximum * 100}%`, backgroundColor: KIND_COLORS[row.kind] }} /></div>
          <p className="mt-1.5 text-xs text-muted">{number(row.requests)} คำขอ · รอ {number(row.pending)} · อนุมัติ {number(row.approved)}</p>
        </button>)}</div>
        <div aria-hidden="true" className="mx-3 mt-2 flex justify-between border-t border-line pt-1 text-xs tabular-nums text-muted">{[0, step, step * 2, step * 3, maximum].map(value => <span key={value}>{number(value)}</span>)}</div>
        <p className="mt-1 text-right text-xs text-muted">หน่วย: คน · เปอร์เซ็นต์เทียบกับนักเรียนทั้งโรงเรียน</p>
      </figure>
    </div>

    <figure aria-labelledby={`${id}-statuses`} className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <figcaption id={`${id}-statuses`} className="flex flex-wrap items-baseline justify-between gap-2 font-semibold text-ink-strong"><span>สถานะการพิจารณาคำขอ</span><span className="text-sm">ทั้งหมด {number(summary.requests)} คำขอ</span></figcaption>
      <p className="mt-1 text-xs text-muted">สัดส่วนเทียบกับจำนวนคำขอในวันที่เลือก รวมคำขอที่ไม่อนุมัติ</p>
      {summary.requests > 0 ? <div aria-hidden="true" className="mt-4 flex h-6 overflow-hidden rounded-lg bg-surface-2">{STATUSES.map(status => <div key={status.key} style={{ width: `${summary.statuses[status.key] / summary.requests * 100}%`, backgroundColor: status.color }} />)}</div> : <p className="mt-4 rounded-lg bg-surface-2 p-3 text-sm text-muted">ยังไม่มีคำขอในวันที่เลือก</p>}
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">{STATUSES.map(status => <div key={status.key} className="flex items-start gap-2"><span aria-hidden="true" className="mt-1 h-3 w-3 shrink-0 rounded" style={{ backgroundColor: status.color }} /><div className="min-w-0"><dt className="text-sm text-muted">{status.label}</dt><dd className="mt-1 font-bold tabular-nums text-ink-strong">{number(summary.statuses[status.key])} คำขอ <span className="text-sm font-normal text-muted">({percentage(summary.requests > 0 ? Math.round(summary.statuses[status.key] / summary.requests * 1000) / 10 : null)})</span></dd></div></div>)}</dl>
    </figure>
  </div>;
}
