"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import LeaveSummaryShare from "@/features/leave/components/leave-summary-share";
import LeaveSummaryCharts from "@/features/leave/components/leave-summary-charts";
import { requestKindLabel } from "@/features/leave/request-kind";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { reviewLeaveRequestAction, retryLeaveAdvisorNotificationAction, deleteLeaveRequestAction } from "@/features/leave/actions";

import { summarizeDailyLeave, type LeaveDailyReport, type LeaveItem, type LeaveKind, type LeaveStatus } from "@/features/leave/daily-report";

function thaiDate(iso: string): string {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

export default function LeaveRequestsBrowser({ report, isAdmin }: { report: LeaveDailyReport; isAdmin: boolean }): React.ReactNode {
  const { items } = report;
  const summary = summarizeDailyLeave(items.filter(item => item.startDate <= report.date && item.endDate >= report.date), report.totalStudents);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [classroom, setClassroom] = useState("");
  const [kind, setKind] = useState<LeaveKind | "ALL">("ALL");
  const classrooms = [...new Set(items.map((item) => item.classroomCode))].sort();
  const [filter, setFilter] = useState<LeaveStatus | "ALL">("ALL");
  const [selected, setSelected] = useState<{ item: LeaveItem; decision: "APPROVED" | "REJECTED" } | null>(null);
  const [viewing, setViewing] = useState<LeaveItem | null>(null);
  const [deleting, setDeleting] = useState<LeaveItem | null>(null);
  const [page, setPage] = useState(1);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const visible = items.filter((item) => (filter === "ALL" || item.status === filter) && (!classroom || item.classroomCode === classroom) && (kind === "ALL" || item.kind === kind) &&
    `${item.studentCode} ${item.studentName} ${item.classroomCode} ${item.sender.displayName ?? ""} ${item.sender.guardianNames.join(" ")} ${item.sender.reference}`.toLowerCase().includes(query.trim().toLowerCase()));

  const pages = Math.max(1, Math.ceil(visible.length / 30));
  const currentPage = Math.min(page, pages);
  const pageItems = visible.slice((currentPage - 1) * 30, currentPage * 30);
  function remove(): void {
    if (!deleting || pending) return;
    startTransition(async () => {
      const result = await deleteLeaveRequestAction(deleting.id);
      setMessage(result.message);
      if (result.ok) { setDeleting(null); setViewing(null); router.refresh(); }
    });
  }

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
    <section className="space-y-4 rounded-2xl border border-line bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h2 className="text-lg font-bold text-ink-strong">สรุปประจำวันที่ {thaiDate(report.date)}</h2><p className="mt-1 text-sm text-muted">{report.term ?? "ยังไม่มีภาคเรียนปัจจุบัน"} · นักเรียนทั้งหมดในโรงเรียน {report.totalStudents.toLocaleString("th-TH")} คน</p></div>
        <form action="/dashboard/leave-requests" method="get" className="flex flex-wrap items-end gap-2">{report.allDates && <input type="hidden" name="view" value="all" />}<label className="text-xs font-semibold text-muted">วันที่ลา / ขอมาสาย<input aria-label="วันที่รายงานคำขอลา" type="date" name="date" defaultValue={report.date} required className="mt-1 block min-h-10 rounded-lg border border-line bg-surface px-3 text-sm text-ink" /></label><button type="submit" className="min-h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white">ดูสรุป</button><Link href="/dashboard/leave-requests" className="min-h-10 rounded-lg border border-line px-3 py-2 text-sm font-semibold">วันนี้</Link></form>
      </div>
      <LeaveSummaryShare report={report} />
      {report.teacherScoped && <p className="rounded-lg bg-brand-soft p-3 text-sm text-brand-ink">แสดงเฉพาะคำขอในห้องที่คุณเป็นครูที่ปรึกษา · เปอร์เซ็นต์เทียบกับนักเรียนทั้งโรงเรียน</p>}
      <LeaveSummaryCharts summary={summary} totalStudents={report.totalStudents} selectedKind={kind} onSelectKind={(value) => { setKind(value); setFilter("ALL"); setPage(1); }} />
      <p className="text-xs leading-relaxed text-muted">นับวันที่อยู่ในช่วงคำขอ ไม่ใช่วันที่ส่ง · จำนวนนักเรียนและเปอร์เซ็นต์นับคนไม่ซ้ำ รวมรอพิจารณาและอนุมัติ ไม่รวมคำขอที่ไม่อนุมัติหรือลบแล้ว · นักเรียนอาจอยู่ได้หลายประเภท จึงไม่ควรบวกเปอร์เซ็นต์แต่ละประเภท · สรุปไม่เปลี่ยนตามตัวกรองรายชื่อ</p>
    </section>
    <div className="rounded-xl border border-line bg-brand-soft p-4 text-sm leading-relaxed text-ink">
      ผู้ปกครองกดเมนู “แจ้งลา” ใน LINE OA แล้วเลือกนักเรียน ประเภท วันลา และเหตุผล ก่อนยืนยันส่งคำขอ · กด “ดูสถานะคำขอ” เพื่อติดตามผลได้ · ต้องผูก LINE กับนักเรียนก่อน
    </div>
    {message && <p role="status" className="rounded-lg bg-brand-soft px-4 py-3 text-sm font-semibold text-ink">{message}</p>}
    <section className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-4"><Link href={`/dashboard/leave-requests?date=${report.date}`} className={`min-h-10 rounded-lg px-3 py-2 text-sm font-semibold ${report.allDates ? "border border-line" : "bg-brand text-white"}`}>รายการวันที่เลือก</Link><Link href={`/dashboard/leave-requests?date=${report.date}&view=all`} className={`min-h-10 rounded-lg px-3 py-2 text-sm font-semibold ${report.allDates ? "bg-brand text-white" : "border border-line"}`}>ทุกวันในภาคเรียนนี้</Link><p className="text-xs text-muted">{report.allDates ? "ใช้ค้นหาคำขอเก่าหรือข้อมูลทดสอบได้" : `คำขอที่ครอบคลุมวันที่ ${thaiDate(report.date)}`}</p></div>
      <div className="flex flex-wrap gap-3 border-b border-line p-4">
        <input aria-label="ค้นหาคำขอลา" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="ค้นหานักเรียน ห้อง ผู้ปกครอง หรือชื่อ LINE" className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm" />
        <select aria-label="กรองห้องเรียนคำขอลา" value={classroom} onChange={(event) => { setClassroom(event.target.value); setPage(1); }} className="min-h-10 rounded-xl border border-line bg-surface px-3 text-sm"><option value="">ทุกห้องเรียน</option>{classrooms.map((room) => <option key={room} value={room}>{room}</option>)}</select>
        <select aria-label="ประเภทการลา" value={kind} onChange={(event) => { setKind(event.target.value as LeaveKind | "ALL"); setPage(1); }} className="min-h-10 rounded-xl border border-line bg-surface px-3 text-sm"><option value="ALL">ทุกประเภท</option><option value="SICK">ลาป่วย</option><option value="PERSONAL">ลากิจ</option><option value="LATE">ขอมาสาย</option></select>
        <select aria-label="กรองสถานะคำขอลา" value={filter} onChange={(event) => { setFilter(event.target.value as LeaveStatus | "ALL"); setPage(1); }} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
          <option value="PENDING">รอพิจารณา</option><option value="APPROVED">อนุมัติแล้ว</option><option value="REJECTED">ไม่อนุมัติ</option><option value="ALL">ทั้งหมด</option>
        </select>
      </div>
      {visible.length === 0 ? <p className="p-10 text-center text-sm text-muted">ไม่พบคำขอลาในตัวกรองนี้</p> : <div className="divide-y divide-line">{pageItems.map((item) => <article key={item.id} className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink-strong">{item.studentName}</span><span className="text-xs text-muted">{item.studentCode} · ห้อง {item.classroomCode}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.status === "PENDING" ? "bg-warning-soft text-warning" : item.status === "APPROVED" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>{item.status === "PENDING" ? "รอพิจารณา" : item.status === "APPROVED" ? "อนุมัติ" : "ไม่อนุมัติ"}</span>
          </div>
          <p className="mt-2 text-sm text-ink">{requestKindLabel(item.kind)} · {thaiDate(item.startDate)}{item.endDate === item.startDate ? "" : ` ถึง ${thaiDate(item.endDate)}`}</p>
          {item.kind === "LATE" && <p className="mt-1 text-sm font-semibold text-brand-ink">คาดว่าจะถึง {item.expectedArrivalTime ?? "—"} น. · อนุมัติแล้วจะยกเว้นหัก 10 คะแนนในวันที่ขอ</p>}
          <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-muted">เหตุผล: {item.reason}</p>
          <p className="mt-2 break-words text-sm text-brand-ink">ส่งจาก LINE: {item.sender.displayName ?? "ชื่อไม่พร้อมใช้งาน"} · อ้างอิง {item.sender.reference}</p>
          <p className="mt-2 text-xs text-muted">แจ้งครูที่ปรึกษาทาง LINE: {item.advisorNotifiedCount ? `${item.advisorNotifiedCount} บัญชี` : "ยังไม่สำเร็จ"} · ส่งคำขอ {new Date(item.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setViewing(item)} className="min-h-10 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-brand-ink">ดูรายละเอียด</button>
          {isAdmin && <button type="button" disabled={pending} onClick={() => setDeleting(item)} className="min-h-10 rounded-lg border border-danger/30 px-3 py-2 text-sm font-semibold text-danger disabled:opacity-50">ลบคำขอ</button>}
          {item.status === "PENDING" && <><button type="button" disabled={pending} onClick={() => { setSelected({ item, decision: "APPROVED" }); setNote(""); }} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">อนุมัติ</button><button type="button" disabled={pending} onClick={() => { setSelected({ item, decision: "REJECTED" }); setNote(""); }} className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink disabled:opacity-50">ไม่อนุมัติ</button></>}
          {isAdmin && item.status === "PENDING" && item.advisorNotifiedCount === 0 && <button type="button" disabled={pending} onClick={() => retryNotification(item.id)} className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-brand-ink disabled:opacity-50">แจ้งครูอีกครั้ง</button>}
        </div>
      </article>)}</div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4 text-sm"><p className="text-muted">พบ {visible.length} คำขอ · หน้า {currentPage}/{pages}</p><div className="flex gap-2"><button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="min-h-10 rounded-lg border border-line px-3 disabled:opacity-40">ก่อนหน้า</button><button type="button" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)} className="min-h-10 rounded-lg border border-line px-3 disabled:opacity-40">ถัดไป</button></div></div>
    </section>
    <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>รายละเอียดคำขอลา</DialogTitle><DialogDescription>{viewing ? `${viewing.studentName} · ${viewing.studentCode} · ห้อง ${viewing.classroomCode}` : ""}</DialogDescription></DialogHeader>
        {viewing && <div className="space-y-3 text-sm text-ink"><section className="space-y-1 rounded-xl border border-line bg-brand-soft p-3"><p className="text-xs text-muted">บัญชี LINE ที่ส่งคำขอ</p><p className="break-words font-semibold">{viewing.sender.displayName ?? "ไม่สามารถโหลดชื่อ LINE ได้"}</p><p className="break-words">{viewing.sender.guardianNames.length ? viewing.sender.guardianNames.join(" · ") : "บัญชีที่ผูกตรงกับนักเรียน / ไม่มีชื่อผู้ปกครองที่ตรงกันในปัจจุบัน"}</p><p className="text-xs text-muted">อ้างอิงบัญชี: {viewing.sender.reference}</p><p className="text-xs text-muted">ชื่อ LINE และข้อมูลผู้ปกครองเป็นข้อมูลปัจจุบัน · รหัสอ้างอิงใช้แยกบัญชีที่ชื่อเหมือนกัน</p></section><p className="rounded-lg bg-surface-2 p-3 font-semibold">{requestKindLabel(viewing.kind)} · {thaiDate(viewing.startDate)}{viewing.endDate === viewing.startDate ? "" : ` ถึง ${thaiDate(viewing.endDate)}`}</p>{viewing.kind === "LATE" && <p className="rounded-xl bg-brand-soft p-3">คาดว่าจะถึง {viewing.expectedArrivalTime ?? "—"} น. (เวลาไทย) · อนุมัติแล้วยกเว้นหัก 10 คะแนนเฉพาะวันที่ขอ โดยไม่แก้เวลาเข้าโรงเรียนจริง</p>}<div><p className="text-xs text-muted">เหตุผลที่ผู้ปกครองแจ้ง</p><p className="mt-1 whitespace-pre-wrap">{viewing.reason}</p></div>{viewing.reviewNote && <div><p className="text-xs text-muted">หมายเหตุจากผู้พิจารณา</p><p className="mt-1 whitespace-pre-wrap">{viewing.reviewNote}</p></div>}<p className="text-xs text-muted">แจ้งครูที่ปรึกษาทาง LINE {viewing.advisorNotifiedCount}/{viewing.advisorTargetCount} บัญชี</p></div>}
        <DialogFooter><button type="button" onClick={() => setViewing(null)} className="min-h-10 rounded-lg border border-line px-4 py-2 text-sm font-semibold">ปิด</button>{viewing?.status === "PENDING" && <><button type="button" onClick={() => { setSelected({ item: viewing, decision: "REJECTED" }); setViewing(null); setNote(""); }} className="min-h-10 rounded-lg border border-line px-4 py-2 text-sm font-semibold">ไม่อนุมัติ</button><button type="button" onClick={() => { setSelected({ item: viewing, decision: "APPROVED" }); setViewing(null); setNote(""); }} className="min-h-10 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">อนุมัติ</button></>}</DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={deleting !== null} onOpenChange={(open) => !pending && !open && setDeleting(null)}>
      <DialogContent><DialogHeader><DialogTitle>ลบคำขอนี้?</DialogTitle><DialogDescription>นำคำขอออกจากรายการ รายงานรายวัน และประวัติคำขอบน LINE โดยเก็บประวัติการลบไว้ในระบบ</DialogDescription></DialogHeader>
      {deleting && <div className="space-y-2 rounded-xl bg-surface p-4 text-sm"><p className="font-semibold">{deleting.studentName} · {deleting.classroomCode}</p><p>{requestKindLabel(deleting.kind)} · {thaiDate(deleting.startDate)}{deleting.startDate === deleting.endDate ? "" : ` ถึง ${thaiDate(deleting.endDate)}`}</p><p>LINE ผู้ส่ง: {deleting.sender.displayName ?? "ชื่อไม่พร้อมใช้งาน"} · {deleting.sender.reference}</p></div>}
      <p className="rounded-lg bg-warning-soft p-3 text-sm text-ink">ผลเช็กชื่อและคะแนนจากการอนุมัติเดิมยังคงอยู่ การลบนี้ไม่ใช่การยกเลิกผลอนุมัติ และจะไม่ส่งข้อความ LINE</p>
      <DialogFooter><button type="button" disabled={pending} onClick={() => setDeleting(null)} className="min-h-10 rounded-lg border border-line px-4 text-sm font-semibold">ยกเลิก</button><button type="button" disabled={pending} onClick={remove} className="min-h-10 rounded-lg bg-danger px-4 text-sm font-semibold text-white disabled:opacity-50">{pending ? "กำลังลบ…" : "ยืนยันลบคำขอ"}</button></DialogFooter></DialogContent>
    </Dialog>
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
