"use client";

import { useMemo, useState } from "react";

type Status = "CONNECTED" | "PENDING" | "UNLINKED" | "NO_ACCOUNT";
interface TeacherRow { id: string; name: string; staffCode: string; type: string; classrooms: string[]; status: Status }

const STATUS: Record<Status, { label: string; className: string }> = {
  CONNECTED: { label: "เชื่อมแล้ว", className: "bg-success-soft text-success" },
  PENDING: { label: "รอส่งรหัส", className: "bg-warning-soft text-warning" },
  UNLINKED: { label: "ยังไม่เชื่อม", className: "bg-surface-2 text-muted" },
  NO_ACCOUNT: { label: "ยังไม่มีบัญชีครู", className: "bg-danger-soft text-danger" },
};

export default function AdvisorLineOverview({ rows }: { rows: TeacherRow[] }): React.ReactNode {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Status | "ALL">("ALL");
  const counts = useMemo(() => ({
    connected: rows.filter((row) => row.status === "CONNECTED").length,
    pending: rows.filter((row) => row.status === "PENDING").length,
    unlinked: rows.filter((row) => row.status === "UNLINKED" || row.status === "NO_ACCOUNT").length,
  }), [rows]);
  const visible = rows.filter((row) => (filter === "ALL" || row.status === filter) && `${row.name} ${row.staffCode} ${row.classrooms.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-line bg-card p-4"><p className="text-sm text-muted">เชื่อมแล้ว</p><p className="mt-1 text-3xl font-bold tabular text-success">{counts.connected}</p></div>
      <div className="rounded-xl border border-line bg-card p-4"><p className="text-sm text-muted">รอส่งรหัส</p><p className="mt-1 text-3xl font-bold tabular text-warning">{counts.pending}</p></div>
      <div className="rounded-xl border border-line bg-card p-4"><p className="text-sm text-muted">ยังไม่เชื่อม</p><p className="mt-1 text-3xl font-bold tabular text-ink-strong">{counts.unlinked}</p></div>
    </div>
    <p className="text-sm text-muted">สถานะ “เชื่อมแล้ว” หมายถึงครูส่งรหัสในแชท LINE OA และระบบบันทึกสำเร็จ การเพิ่มเพื่อนอย่างเดียวยังไม่ทำให้เชื่อมบัญชี</p>
    <section className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
      <div className="flex flex-wrap gap-3 border-b border-line p-4">
        <input aria-label="ค้นหาครู" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อ รหัส หรือห้องที่ปรึกษา" className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm" />
        <select aria-label="กรองสถานะ LINE" value={filter} onChange={(event) => setFilter(event.target.value as Status | "ALL")} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
          <option value="ALL">ทุกสถานะ</option><option value="CONNECTED">เชื่อมแล้ว</option><option value="PENDING">รอส่งรหัส</option><option value="UNLINKED">ยังไม่เชื่อม</option><option value="NO_ACCOUNT">ยังไม่มีบัญชีครู</option>
        </select>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm">
        <thead className="bg-surface-2 text-muted"><tr><th className="px-4 py-3 font-semibold">ครูและบุคลากร</th><th className="px-4 py-3 font-semibold">รหัส</th><th className="px-4 py-3 font-semibold">ห้องที่ปรึกษา</th><th className="px-4 py-3 font-semibold">สถานะ LINE</th></tr></thead>
        <tbody className="divide-y divide-line">{visible.map((row) => <tr key={row.id}>
          <td className="px-4 py-3 font-semibold text-ink">{row.name}</td>
          <td className="px-4 py-3 text-muted">{row.staffCode}</td>
          <td className="px-4 py-3 text-muted">{row.classrooms.join(", ") || "—"}</td>
          <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS[row.status].className}`}>{STATUS[row.status].label}</span></td>
        </tr>)}</tbody>
      </table></div>
      {visible.length === 0 && <p className="p-8 text-center text-sm text-muted">ไม่พบครูที่ตรงกับตัวกรอง</p>}
    </section>
  </div>;
}
