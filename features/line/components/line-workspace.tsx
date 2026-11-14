"use client";

import { useState, type ReactNode } from "react";
import { LayoutGrid, ListFilter } from "lucide-react";

export default function LineWorkspace({ overview, accounts, initialView }: { overview: ReactNode; accounts: ReactNode; initialView: "overview" | "accounts" }): ReactNode {
  const [view, setView] = useState(initialView);
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-white p-2 shadow-sm">
      <div role="group" aria-label="มุมมองการเชื่อม LINE" className="flex flex-wrap gap-1">{[{ key: "overview" as const, label: "ภาพรวมรายห้อง", icon: LayoutGrid }, { key: "accounts" as const, label: "รายชื่อ บัญชี และรหัส", icon: ListFilter }].map(({ key, label, icon: Icon }) => <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)} className={`flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold ${view === key ? "bg-brand text-white shadow-sm" : "text-muted hover:bg-brand-softer"}`}><Icon className="size-4" />{label}</button>)}</div>
      <p className="px-3 text-xs text-muted">รหัสและบัญชีที่ผูก ดูได้จาก “ดูและจัดการ”</p>
    </div>
    <div hidden={view !== "overview"}>{overview}</div>
    <div hidden={view !== "accounts"}>{accounts}</div>
  </section>;
}
