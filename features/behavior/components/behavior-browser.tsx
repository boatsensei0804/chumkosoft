"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatStrip from "@/components/ui/stat-strip";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { addBehaviorPointsAction, updateBehaviorPointsAction, deleteBehaviorPointsAction } from "@/features/behavior/actions";
import ConfirmDialog from "@/components/ui/confirm-dialog";

interface StudentSummary { id: string; code: string; name: string; classroom: string; score: number }
interface PointHistory { id: string; delta: number; source: "MANUAL" | "LATE_ENTRY"; title: string; note: string | null; actorName: string; createdAt: string; canManage: boolean }
interface Data { term: { id: string; name: string } | null; students: StudentSummary[]; selectedStudent: StudentSummary | null; history: PointHistory[] }

export default function BehaviorBrowser({ data }: { data: Data }): React.ReactNode {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [classroom, setClassroom] = useState("");
  const [direction, setDirection] = useState<"ADD" | "DEDUCT">("DEDUCT");
  const [points, setPoints] = useState("10");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveReview, setSaveReview] = useState(false);
  const [deleting, setDeleting] = useState<PointHistory | null>(null);
  const [pending, startTransition] = useTransition();
  const classrooms = [...new Set(data.students.map((student) => student.classroom))].sort();
  const visible = data.students.filter((student) => (!classroom || student.classroom === classroom) && `${student.code} ${student.name}`.toLowerCase().includes(query.trim().toLowerCase()));

  function save(): void {
    if (!data.selectedStudent || pending) return;

    startTransition(async () => {
      const result = editingId
        ? await updateBehaviorPointsAction({ id: editingId, direction, points: Number(points), title, note })
        : await addBehaviorPointsAction({ studentId: data.selectedStudent!.id, direction, points: Number(points), title, note, requestId: crypto.randomUUID() });
      setMessage(result.message);
      if (result.ok) { setSaveReview(false); setTitle(""); setNote(""); setEditingId(null); router.refresh(); }
    });
  }

  function edit(entry: PointHistory): void {
    setEditingId(entry.id);
    setDirection(entry.delta >= 0 ? "ADD" : "DEDUCT");
    setPoints(String(Math.abs(entry.delta)));
    setTitle(entry.title);
    setNote(entry.note ?? "");
    document.getElementById("behavior-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function confirmDelete(): void {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteBehaviorPointsAction(deleting.id);
      setMessage(result.message);
      setDeleting(null);
      if (result.ok) { if (editingId === deleting.id) setEditingId(null); router.refresh(); }
    });
  }

  return <div className="space-y-5">
    <div className="rounded-xl border border-line bg-brand-soft p-4 text-sm text-ink">คะแนนเริ่มต้น <strong>100</strong> ต่อภาคเรียน · การเข้าโรงเรียนสายหัก <strong>10</strong> คะแนนต่อวัน ไม่หักซ้ำเมื่อสแกนหลายครั้ง</div>
    {!data.term ? <p className="rounded-xl border border-line bg-card p-8 text-center text-sm text-muted">ยังไม่มีภาคเรียนที่ใช้งาน</p> : <>
      <p className="text-sm font-semibold text-muted">{data.term.name}</p>
      {message && <p role="status" className="rounded-lg bg-brand-soft px-4 py-3 text-sm text-ink">{message}</p>}
      <StatStrip items={[{ label: "นักเรียนในรายการ", value: data.students.length, hint: "คน", tone: "brand" }, { label: "ต่ำกว่า 50 คะแนน", value: data.students.filter((student) => student.score < 50).length, hint: "คน", tone: "danger" }, { label: "ตั้งแต่ 100 คะแนน", value: data.students.filter((student) => student.score >= 100).length, hint: "คน", tone: "success" }]} />
      <div>
        <section className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
          <div className="flex flex-wrap gap-3 border-b border-line p-4">
            <input aria-label="ค้นหานักเรียน" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหารหัสหรือชื่อนักเรียน" className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm" />
            <select aria-label="กรองห้องเรียน" value={classroom} onChange={(event) => setClassroom(event.target.value)} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"><option value="">ทุกห้อง</option>{classrooms.map((code) => <option key={code} value={code}>{code}</option>)}</select>
          </div>
          <div className="max-h-[65vh] overflow-y-auto divide-y divide-line">{visible.map((student) => <button key={student.id} type="button" onClick={() => router.push(`/dashboard/behavior?student=${encodeURIComponent(student.id)}`)} className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-surface-2 ${data.selectedStudent?.id === student.id ? "bg-brand-soft" : ""}`}>
            <span className="min-w-0"><span className="block truncate text-sm font-semibold text-ink">{student.name}</span><span className="text-xs text-muted">{student.code} · {student.classroom}</span></span>
            <span className={`shrink-0 text-lg font-bold tabular ${student.score < 50 ? "text-danger" : "text-brand-ink"}`}>{student.score}</span>
          </button>)}</div>
          {visible.length === 0 && <p className="p-8 text-center text-sm text-muted">ไม่พบนักเรียน</p>}
        </section>
        <Dialog open={data.selectedStudent !== null} onOpenChange={(open) => { if (!open && !pending) router.push("/dashboard/behavior"); }}><DialogContent className="sm:max-w-3xl"><DialogHeader className="text-left"><DialogTitle>ข้อมูลคะแนนความประพฤติ</DialogTitle><DialogDescription>ดูคะแนนและประวัติของนักเรียน พร้อมเพิ่ม หัก หรือแก้ไขรายการที่คุณมีสิทธิ์</DialogDescription></DialogHeader><section>
          {!data.selectedStudent ? <div className="py-12 text-center text-sm text-muted">เลือกนักเรียนจากตารางเพื่อดูคะแนนและบันทึกรายการ</div> : <>

            {message && <p role="status" className="mb-3 rounded-xl bg-blue-50 p-3 text-sm">{message}</p>}
            <p className="text-sm text-muted">{data.selectedStudent.classroom} · {data.selectedStudent.code}</p>
            <h2 className="mt-1 text-lg font-bold text-ink-strong">{data.selectedStudent.name}</h2>
            <p className="mt-2 text-3xl font-bold tabular text-brand-ink">{data.selectedStudent.score} <span className="text-sm font-medium text-muted">คะแนน</span></p>
            <div id="behavior-form" className="mt-5 scroll-mt-24 border-t border-line pt-5">
              <h3 className="text-sm font-bold text-ink">{editingId ? "แก้ไขรายการคะแนน" : "เพิ่มหรือหักคะแนน"}</h3>
              <div className="mt-3 flex gap-2"><button type="button" aria-pressed={direction === "ADD"} onClick={() => setDirection("ADD")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${direction === "ADD" ? "bg-success-soft text-success" : "border border-line text-muted"}`}>เพิ่มคะแนน</button><button type="button" aria-pressed={direction === "DEDUCT"} onClick={() => setDirection("DEDUCT")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${direction === "DEDUCT" ? "bg-danger-soft text-danger" : "border border-line text-muted"}`}>หักคะแนน</button></div>
              <label className="mt-3 block text-sm font-semibold text-ink" htmlFor="behavior-points">จำนวนคะแนน</label><input id="behavior-points" type="number" min={1} max={100} step={1} value={points} onChange={(event) => setPoints(event.target.value)} className="mt-1 w-28 rounded-lg border border-line bg-surface px-3 py-2 text-sm" />
              <label className="mt-3 block text-sm font-semibold text-ink" htmlFor="behavior-title">หัวข้อ/เหตุผล (จำเป็น)</label><input id="behavior-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="เช่น ช่วยงานโรงเรียน" className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm" />
              <label className="mt-3 block text-sm font-semibold text-ink" htmlFor="behavior-note">รายละเอียดเพิ่มเติม</label><textarea id="behavior-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={2} className="mt-1 w-full rounded-lg border border-line bg-surface p-3 text-sm" />
              <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={pending || title.trim().length < 3 || !Number.isInteger(Number(points)) || Number(points) < 1 || Number(points) > 100} onClick={() => setSaveReview(true)} className="min-h-10 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "กำลังบันทึก…" : editingId ? "บันทึกการแก้ไข" : `บันทึก${direction === "ADD" ? "เพิ่ม" : "หัก"}คะแนน`}</button>{editingId && <button type="button" disabled={pending} onClick={() => { setEditingId(null); setTitle(""); setNote(""); }} className="min-h-10 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink">ยกเลิกการแก้ไข</button>}</div>
            </div>
            <div className="mt-6 border-t border-line pt-5"><h3 className="text-sm font-bold text-ink">ประวัติคะแนน</h3>
              {data.history.length === 0 ? <p className="mt-3 text-sm text-muted">ยังไม่มีรายการ เริ่มที่ 100 คะแนน</p> : <div className="mt-3 divide-y divide-line">{data.history.map((entry) => <div key={entry.id} className="flex items-start justify-between gap-3 py-3"><div className="min-w-0"><p className="text-sm font-semibold text-ink">{entry.title}</p>{entry.note && <p className="text-xs text-muted">{entry.note}</p>}<p className="mt-1 text-xs text-muted">{entry.actorName} · {new Date(entry.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })}</p>{entry.canManage && <div className="mt-2 flex flex-wrap gap-1"><button type="button" disabled={pending} onClick={() => edit(entry)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-line px-2.5 text-xs font-semibold text-brand-ink"><Pencil className="size-3.5" /> แก้ไข</button><button type="button" disabled={pending} onClick={() => setDeleting(entry)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-line px-2.5 text-xs font-semibold text-danger"><Trash2 className="size-3.5" /> ลบ</button></div>}</div><span className={`shrink-0 font-bold tabular ${entry.delta < 0 ? "text-danger" : entry.delta > 0 ? "text-success" : "text-muted"}`}>{entry.delta > 0 ? "+" : ""}{entry.delta}</span></div>)}</div>}
            </div>
          </>}
        </section></DialogContent></Dialog>
      </div>
      <ConfirmDialog open={saveReview} title="ยืนยันบันทึกคะแนน" message={`${data.selectedStudent?.name ?? ""} · ${direction === "ADD" ? "เพิ่ม" : "หัก"} ${points} คะแนน · ${title}`} confirmLabel="ยืนยันบันทึก" pending={pending} onConfirm={save} onClose={() => setSaveReview(false)} />
      <ConfirmDialog open={deleting !== null} title="ลบรายการคะแนนที่บันทึกผิด" message={deleting ? `ยืนยันลบ “${deleting.title}” (${deleting.delta > 0 ? "+" : ""}${deleting.delta} คะแนน) ของ ${data.selectedStudent?.name ?? "นักเรียน"} ใช่ไหม? คะแนนรวมจะคำนวณใหม่ และระบบจะบันทึกประวัติการลบ` : ""} confirmLabel="ลบรายการ" destructive pending={pending} onConfirm={confirmDelete} onClose={() => setDeleting(null)} />
    </>}
  </div>;
}
