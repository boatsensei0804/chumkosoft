"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const counts = useMemo(() => ({
    connected: rows.filter((row) => row.status === "CONNECTED").length,
    pending: rows.filter((row) => row.status === "PENDING").length,
    unlinked: rows.filter((row) => row.status === "UNLINKED" || row.status === "NO_ACCOUNT").length,
  }), [rows]);
  const visible = rows.filter((row) => (filter === "ALL" || row.status === filter) && `${row.name} ${row.staffCode} ${row.classrooms.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));
  const viewing = rows.find((row) => row.id === viewingId) ?? null;

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
      <div className="md:overflow-x-auto"><table className="w-full text-left text-sm md:min-w-[550px]">
        <thead className="hidden bg-surface-2 text-muted md:table-header-group"><tr><th className="px-4 py-3 font-semibold">ครูและบุคลากร</th><th className="px-4 py-3 font-semibold">สถานะ LINE</th><th className="px-4 py-3 text-right font-semibold">จัดการ</th></tr></thead>
        <tbody className="block space-y-3 p-3 md:table-row-group md:space-y-0 md:divide-y md:divide-line md:p-0">{visible.map((row) => <tr key={row.id} className="block rounded-xl border border-line p-1 md:table-row md:rounded-none md:border-0 md:p-0">
          <td className="block px-3 py-2 font-semibold text-ink md:table-cell md:px-4 md:py-3">{row.name}<p className="mt-1 text-xs font-normal text-muted">{row.staffCode} · ห้องที่ปรึกษา {row.classrooms.join(", ") || "—"}</p></td>
          <td className="block px-3 py-2 md:table-cell md:px-4 md:py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS[row.status].className}`}>{STATUS[row.status].label}</span></td>
          <td className="block px-3 py-3 md:table-cell md:px-4 md:text-right"><button type="button" onClick={() => setViewingId(row.id)} className="min-h-10 rounded-lg border border-line px-3 py-2 font-semibold text-brand-ink hover:bg-surface-2">ดูและจัดการ</button></td>
        </tr>)}</tbody>
      </table></div>
      {visible.length === 0 && <p className="p-8 text-center text-sm text-muted">ไม่พบครูที่ตรงกับตัวกรอง</p>}
    </section>
    <Dialog open={viewing !== null} onOpenChange={(open) => { if (!open) setViewingId(null); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{viewing?.name ?? "ข้อมูล LINE ครู"}</DialogTitle><DialogDescription>{viewing ? `รหัสบุคลากร ${viewing.staffCode} · ห้องที่ปรึกษา ${viewing.classrooms.join(", ") || "—"}` : ""}</DialogDescription></DialogHeader>
        {viewing && <div className="space-y-4 text-sm">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS[viewing.status].className}`}>{STATUS[viewing.status].label}</span>
          {viewing.lineDisplayName && <p className="rounded-lg bg-surface-2 p-3">ชื่อ LINE: <strong>{viewing.lineDisplayName}</strong></p>}
          {viewing.code && <div className="flex flex-wrap items-center gap-2 rounded-lg bg-brand-soft p-3"><span>รหัสเชื่อม</span><span className="font-mono font-bold tracking-widest text-brand-ink select-all">{viewing.code}</span><button type="button" aria-label={`คัดลอกรหัสของ ${viewing.name}`} onClick={() => copy(viewing.code!)} className="grid size-10 place-items-center rounded-lg hover:bg-card"><Copy className="size-4" /></button></div>}
          {viewing.status === "NO_ACCOUNT" ? <p className="text-muted">ต้องสร้างบัญชีครูที่เปิดใช้งานก่อน จึงจะออกรหัสเชื่อมได้</p> : <div className="flex flex-wrap gap-2">
            {viewing.status !== "CONNECTED" && <button type="button" disabled={pending} onClick={() => generate(viewing.id)} className="min-h-10 rounded-lg border border-line px-3 py-2 font-semibold text-brand-ink disabled:opacity-50">{viewing.code ? "สร้างรหัสใหม่" : "สร้างรหัส"}</button>}
            {(viewing.status === "CONNECTED" || viewing.status === "PENDING") && <button type="button" disabled={pending} onClick={() => setUnlinking(viewing)} className="min-h-10 rounded-lg border border-line px-3 py-2 font-semibold text-danger hover:bg-danger-soft disabled:opacity-50">{viewing.status === "CONNECTED" ? "ยกเลิกการผูก" : "ลบรหัส"}</button>}
          </div>}
        </div>}
      </DialogContent>
    </Dialog>
    <ConfirmDialog open={unlinking !== null} title="ยกเลิกการผูก LINE ครู" message={unlinking ? `ยืนยันยกเลิกบัญชีของ ${unlinking.name}${unlinking.lineDisplayName ? ` (LINE: ${unlinking.lineDisplayName})` : ""} ใช่ไหม? ครูจะไม่ได้รับสรุปและประกาศผ่านบัญชีนี้จนกว่าจะผูกใหม่` : ""} confirmLabel="ยืนยันยกเลิก" destructive pending={pending} onConfirm={unlink} onClose={() => setUnlinking(null)} />
  </div>;
}
