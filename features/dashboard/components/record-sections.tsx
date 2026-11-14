"use client";

import { Children, useState, type ReactNode } from "react";
import { LayoutList, ChevronRight } from "lucide-react";

export default function RecordSections({ labels, children }: { labels: string[]; children: ReactNode }): ReactNode {
  const [selected, setSelected] = useState<number | "all">(0);
  const sections = Children.toArray(children);
  return <div className="grid items-start gap-4 lg:grid-cols-[210px_minmax(0,1fr)]">
    <nav aria-label="หมวดข้อมูลรายละเอียด" className="rounded-2xl border border-blue-100 bg-white p-2 lg:sticky lg:top-3"><p className="px-3 pb-2 pt-1 text-[11px] font-semibold text-muted">หมวดข้อมูล · {labels.length} หมวด</p><div className="flex flex-wrap gap-1 lg:flex-col">{labels.map((label, index) => <button key={label} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)} className={`flex min-h-10 items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold ${selected === index ? "bg-brand text-white" : "text-muted hover:bg-brand-soft"}`}><span>{label}</span><ChevronRight className="hidden size-3.5 shrink-0 lg:block" /></button>)}<button type="button" aria-pressed={selected === "all"} onClick={() => setSelected("all")} className={`flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold ${selected === "all" ? "bg-brand text-white" : "text-brand-ink hover:bg-brand-soft"}`}><LayoutList className="size-3.5" />แสดงข้อมูลทั้งหมด</button></div></nav>
    <div className="min-w-0 space-y-4">{sections.map((section, index) => <div key={labels[index] ?? index} hidden={selected !== "all" && selected !== index}>{section}</div>)}</div>
  </div>;
}
