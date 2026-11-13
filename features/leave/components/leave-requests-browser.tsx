"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { reviewLeaveRequestAction, retryLeaveAdvisorNotificationAction } from "@/features/leave/actions";

type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";
type LeaveKind = "SICK" | "PERSONAL";
interface LeaveItem {
  id: string; studentCode: string; studentName: string; classroomCode: string; kind: LeaveKind;
  startDate: string; endDate: string; reason: string; status: LeaveStatus; reviewNote: string | null;
  advisorNotifiedCount: number; advisorTargetCount: number; createdAt: string;
}

function thaiDate(iso: string): string {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

export default function LeaveRequestsBrowser({ items, isAdmin }: { items: LeaveItem[]; isAdmin: boolean }): React.ReactNode {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LeaveStatus | "ALL">("PENDING");
  const [selected, setSelected] = useState<{ item: LeaveItem; decision: "APPROVED" | "REJECTED" } | null>(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const counts = {
    pending: items.filter((item) => item.status === "PENDING").length,
    approved: items.filter((item) => item.status === "APPROVED").length,
    rejected: items.filter((item) => item.status === "REJECTED").length,
  };
  const visible = items.filter((item) => (filter === "ALL" || item.status === filter) &&
    `${item.studentCode} ${item.studentName} ${item.classroomCode}`.toLowerCase().includes(query.trim().toLowerCase()));

  function review(): void {
    if (!selected || pending) return;
    startTransition(async () => {
      const result = await reviewLeaveRequestAction(selected.item.id, selected.decision, note);
      setMessage(result.message);
      if (result.ok) { setSelected(null); setNote(""); router.refresh(); }
    });
  }

  function retryNotification(id: string): void {
    startTransition(async () => {
      const result = await retryLeaveAdvisorNotificationAction(id);
      setMessage(result.message);
      router.refresh();
    });
  }

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-line bg-card p-4"><p className="text-sm text-muted">รอพิจารณา</p><p className="mt-1 text-3xl font-bold tabular text-warning">{counts.pending}</p></div>
      <div className="rounded-xl border border-line bg-card p-4"><p className="text-sm text-muted">อนุมัติ (ล่าสุด 100 รายการ)</p><p className="mt-1 text-3xl font-bold tabular text-success">{counts.approved}</p></div>
      <div className="rounded-xl border border-line bg-card p-4"><p className="text-sm text-muted">ไม่อนุมัติ (ล่าสุด 100 รายการ)</p><p className="mt-1 text-3xl font-bold tabular text-ink-strong">{counts.rejected}</p></div>
    </div>
    <div className="rounded-xl border border-line bg-brand-soft p-4 text-sm leading-relaxed text-ink">
      ผู้ปกครองส่งข้อความใน LINE OA เช่น <span className="font-mono font-semibold">ลา 68-0421 ป่วย 14/11/2569 ถึง 15/11/2569 มีไข้</span> · วันเดียวไม่ต้องใส่ “ถึง” · ต้องผูก LINE กับนักเรียนก่อน
    </div>
    {message && <p role="status" className="rounded-lg bg-brand-soft px-4 py-3 text-sm font-semibold text-ink">{message}</p>}
    <section className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
      <div className="flex flex-wrap gap-3 border-b border-line p-4">
        <input aria-label="ค้นหาคำขอลา" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหารหัส ชื่อนักเรียน หรือห้อง" className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm" />
        <select aria-label="กรองสถานะคำขอลา" value={filter} onChange={(event) => setFilter(event.target.value as LeaveStatus | "ALL")} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
          <option value="PENDING">รอพิจารณา</option><option value="APPROVED">อนุมัติแล้ว</option><option value="REJECTED">ไม่อนุมัติ</option><option value="ALL">ทั้งหมด</option>
        </select>
      </div>
      {visible.length === 0 ? <p className="p-10 text-center text-sm text-muted">ไม่พบคำขอลาในตัวกรองนี้</p> : <div className="divide-y divide-line">{visible.map((item) => <article key={item.id} className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink-strong">{item.studentName}</span><span className="text-xs text-muted">{item.studentCode} · ห้อง {item.classroomCode}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.status === "PENDING" ? "bg-warning-soft text-warning" : item.status === "APPROVED" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>{item.status === "PENDING" ? "รอพิจารณา" : item.status === "APPROVED" ? "อนุมัติ" : "ไม่อนุมัติ"}</span>
          </div>
          <p className="mt-2 text-sm text-ink">{item.kind === "SICK" ? "ลาป่วย" : "ลากิจ"} · {thaiDate(item.startDate)}{item.endDate === item.startDate ? "" : ` ถึง ${thaiDate(item.endDate)}`}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted">เหตุผล: {item.reason}</p>
          {item.reviewNote && <p className="mt-1 text-sm text-muted">หมายเหตุจากผู้พิจารณา: {item.reviewNote}</p>}
          <p className="mt-2 text-xs text-muted">แจ้งครูที่ปรึกษาทาง LINE: {item.advisorNotifiedCount ? `${item.advisorNotifiedCount} บัญชี` : "ยังไม่สำเร็จ"} · ส่งคำขอ {new Date(item.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {item.status === "PENDING" && <><button type="button" disabled={pending} onClick={() => { setSelected({ item, decision: "APPROVED" }); setNote(""); }} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">อนุมัติ</button><button type="button" disabled={pending} onClick={() => { setSelected({ item, decision: "REJECTED" }); setNote(""); }} className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink disabled:opacity-50">ไม่อนุมัติ</button></>}
          {isAdmin && item.status === "PENDING" && item.advisorNotifiedCount === 0 && <button type="button" disabled={pending} onClick={() => retryNotification(item.id)} className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-brand-ink disabled:opacity-50">แจ้งครูอีกครั้ง</button>}
        </div>
      </article>)}</div>}
    </section>
    <Dialog open={selected !== null} onOpenChange={(open) => !pending && !open && setSelected(null)}>
      <DialogContent>
        <DialogHeader><DialogTitle>{selected?.decision === "APPROVED" ? "อนุมัติคำขอลา" : "ไม่อนุมัติคำขอลา"}</DialogTitle>
          <DialogDescription>ตรวจชื่อนักเรียน ช่วงวันที่ และเหตุผลก่อนบันทึก</DialogDescription></DialogHeader>
        {selected && <div className="rounded-lg bg-surface p-4 text-sm text-ink"><p className="font-semibold">{selected.item.studentName} · {selected.item.classroomCode}</p><p className="mt-1">{thaiDate(selected.item.startDate)}{selected.item.endDate === selected.item.startDate ? "" : ` ถึง ${thaiDate(selected.item.endDate)}`}</p><p className="mt-1 whitespace-pre-wrap">{selected.item.reason}</p></div>}
        <label className="text-sm font-semibold text-ink" htmlFor="leave-review-note">{selected?.decision === "REJECTED" ? "เหตุผลที่ไม่อนุมัติ (จำเป็น)" : "หมายเหตุ (ไม่บังคับ)"}</label>
        <textarea id="leave-review-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={3} className="rounded-lg border border-line bg-surface p-3 text-sm" />
        <DialogFooter><button type="button" disabled={pending} onClick={() => setSelected(null)} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold">ยกเลิก</button><button type="button" disabled={pending || (selected?.decision === "REJECTED" && note.trim().length < 3)} onClick={review} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "กำลังบันทึก…" : "ยืนยันผล"}</button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
