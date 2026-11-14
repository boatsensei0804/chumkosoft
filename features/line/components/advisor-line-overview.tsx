"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { generateAdvisorLineCodeAction, unlinkAdvisorLineAction } from "@/features/line/advisor-code-actions";
import ConfirmDialog from "@/components/ui/confirm-dialog";

type Status = "CONNECTED" | "PENDING" | "UNLINKED" | "NO_ACCOUNT";
interface TeacherRow { id: string; name: string; staffCode: string; code: string | null; lineDisplayName: string | null; type: string; classrooms: string[]; status: Status }

const STATUS: Record<Status, { label: string; className: string }> = {
  CONNECTED: { label: "เชื่อมแล้ว", className: "bg-success-soft text-success" },
  PENDING: { label: "รอส่งรหัส", className: "bg-warning-soft text-warning" },
  UNLINKED: { label: "ยังไม่เชื่อม", className: "bg-surface-2 text-muted" },
  NO_ACCOUNT: { label: "ยังไม่มีบัญชีครู", className: "bg-danger-soft text-danger" },
};

export default function AdvisorLineOverview({ rows }: { rows: TeacherRow[] }): React.ReactNode {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Status | "ALL">("ALL");
  const [message, setMessage] = useState("");
  const [unlinking, setUnlinking] = useState<TeacherRow | null>(null);
  const [pending, startTransition] = useTransition();
  const counts = useMemo(() => ({
    connected: rows.filter((row) => row.status === "CONNECTED").length,
    pending: rows.filter((row) => row.status === "PENDING").length,
    unlinked: rows.filter((row) => row.status === "UNLINKED" || row.status === "NO_ACCOUNT").length,
  }), [rows]);
  const visible = rows.filter((row) => (filter === "ALL" || row.status === filter) && `${row.name} ${row.staffCode} ${row.classrooms.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));

  function generate(staffId: string): void {
    startTransition(async () => {
      const result = await generateAdvisorLineCodeAction(staffId);
      setMessage(result.message);
      router.refresh();
    });
  }

  async function copy(code: string): Promise<void> {
    try { await navigator.clipboard.writeText(code); setMessage("คัดลอกรหัสแล้ว"); }
    catch { setMessage("คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกรหัสแล้วคัดลอกเอง"); }
  }

  function unlink(): void {
    if (!unlinking) return;
    startTransition(async () => {
      const result = await unlinkAdvisorLineAction(unlinking.id);
      setMessage(result.message);
      setUnlinking(null);
      if (result.ok) router.refresh();
    });
  }

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-line bg-card p-4"><p className="text-sm text-muted">เชื่อมแล้ว</p><p className="mt-1 text-3xl font-bold tabular text-success">{counts.connected}</p></div>
      <div className="rounded-xl border border-line bg-card p-4"><p className="text-sm text-muted">รอส่งรหัส</p><p className="mt-1 text-3xl font-bold tabular text-warning">{counts.pending}</p></div>
      <div className="rounded-xl border border-line bg-card p-4"><p className="text-sm text-muted">ยังไม่เชื่อม</p><p className="mt-1 text-3xl font-bold tabular text-ink-strong">{counts.unlinked}</p></div>
    </div>
    <p className="text-sm text-muted">สถานะ “เชื่อมแล้ว” หมายถึงครูส่งรหัสในแชท LINE OA และระบบบันทึกสำเร็จ การเพิ่มเพื่อนอย่างเดียวยังไม่ทำให้เชื่อมบัญชี</p>
    <p className="text-sm text-muted">แอดมินเป็นผู้ออกรหัสให้ครู ครูดูรหัสได้ในหน้า LINE ของฉันและส่งรหัสในแชท LINE OA</p>
    {message && <p role="status" className="rounded-lg bg-brand-soft px-4 py-2 text-sm text-ink">{message}</p>}
    <section className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
      <div className="flex flex-wrap gap-3 border-b border-line p-4">
        <input aria-label="ค้นหาครู" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อ รหัส หรือห้องที่ปรึกษา" className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm" />
        <select aria-label="กรองสถานะ LINE" value={filter} onChange={(event) => setFilter(event.target.value as Status | "ALL")} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
          <option value="ALL">ทุกสถานะ</option><option value="CONNECTED">เชื่อมแล้ว</option><option value="PENDING">รอส่งรหัส</option><option value="UNLINKED">ยังไม่เชื่อม</option><option value="NO_ACCOUNT">ยังไม่มีบัญชีครู</option>
        </select>
      </div>
      <div className="md:overflow-x-auto"><table className="w-full text-left text-sm md:min-w-[650px]">
        <thead className="hidden bg-surface-2 text-muted md:table-header-group"><tr><th className="px-4 py-3 font-semibold">ครูและบุคลากร</th><th className="px-4 py-3 font-semibold">รหัสบุคลากร</th><th className="px-4 py-3 font-semibold">ห้องที่ปรึกษา</th><th className="px-4 py-3 font-semibold">สถานะ LINE</th><th className="px-4 py-3 font-semibold">รหัสเชื่อม / จัดการ</th></tr></thead>
        <tbody className="block space-y-3 p-3 md:table-row-group md:space-y-0 md:divide-y md:divide-line md:p-0">{visible.map((row) => <tr key={row.id} className="block rounded-xl border border-line p-1 md:table-row md:rounded-none md:border-0 md:p-0">
          <td className="block px-3 py-2 font-semibold text-ink md:table-cell md:px-4 md:py-3">{row.name}{row.lineDisplayName && <p className="mt-1 text-xs font-medium text-brand-ink">ชื่อ LINE: {row.lineDisplayName}</p>}</td>
          <td className="block px-3 py-1 text-muted md:table-cell md:px-4 md:py-3"><span className="md:hidden">รหัสบุคลากร: </span>{row.staffCode}</td>
          <td className="block px-3 py-1 text-muted md:table-cell md:px-4 md:py-3"><span className="md:hidden">ห้องที่ปรึกษา: </span>{row.classrooms.join(", ") || "—"}</td>
          <td className="block px-3 py-2 md:table-cell md:px-4 md:py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS[row.status].className}`}>{STATUS[row.status].label}</span></td>
          <td className="block px-3 py-3 md:table-cell md:px-4">{row.status !== "NO_ACCOUNT" && <div className="flex flex-wrap items-center gap-2">
            {row.code && <><span className="font-mono font-bold tracking-widest text-brand-ink select-all">{row.code}</span><button type="button" aria-label={`คัดลอกรหัสของ ${row.name}`} onClick={() => copy(row.code!)} className="grid size-9 place-items-center rounded text-muted hover:bg-surface-2"><Copy className="size-4" /></button></>}
            {row.status !== "CONNECTED" && <button type="button" disabled={pending} onClick={() => generate(row.id)} className="min-h-9 whitespace-nowrap rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-brand-ink disabled:opacity-50">{row.code ? "สร้างรหัสใหม่" : "สร้างรหัส"}</button>}
            {(row.status === "CONNECTED" || row.status === "PENDING") && <button type="button" disabled={pending} onClick={() => setUnlinking(row)} className="min-h-9 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-danger-soft disabled:opacity-50">{row.status === "CONNECTED" ? "ยกเลิกการผูก" : "ลบรหัส"}</button>}
          </div>}</td>
        </tr>)}</tbody>
      </table></div>
      {visible.length === 0 && <p className="p-8 text-center text-sm text-muted">ไม่พบครูที่ตรงกับตัวกรอง</p>}
    </section>
    <ConfirmDialog open={unlinking !== null} title="ยกเลิกการผูก LINE ครู" message={unlinking ? `ยืนยันยกเลิกบัญชีของ ${unlinking.name}${unlinking.lineDisplayName ? ` (LINE: ${unlinking.lineDisplayName})` : ""} ใช่ไหม? ครูจะไม่ได้รับสรุปและประกาศผ่านบัญชีนี้จนกว่าจะผูกใหม่` : ""} confirmLabel="ยืนยันยกเลิก" destructive pending={pending} onConfirm={unlink} onClose={() => setUnlinking(null)} />
  </div>;
}
