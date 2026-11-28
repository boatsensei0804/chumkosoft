"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, ClipboardList, Minus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import MascotEmptyState from "@/components/ui/mascot-empty-state";
import { addBehaviorPointsAction, updateBehaviorPointsAction, deleteBehaviorPointsAction } from "@/features/behavior/actions";
import { cn } from "@/lib/utils";

interface StudentSummary { id: string; code: string; name: string; classroom: string; score: number }
interface PointHistory { id: string; delta: number; source: "MANUAL" | "LATE_ENTRY"; title: string; note: string | null; actorName: string; createdAt: string; canManage: boolean }
interface Data { term: { id: string; name: string } | null; students: StudentSummary[]; selectedStudent: StudentSummary | null; history: PointHistory[] }

const field = "min-h-11 rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink";
const signed = (points: number): string => points > 0 ? `+${points}` : String(points);
const pointTone = (delta: number): string => delta < 0 ? "text-danger" : delta > 0 ? "text-success" : "text-muted";

export default function BehaviorBrowser({ data }: { data: Data }): React.ReactNode {
  const [query, setQuery] = useState("");
  const [classroom, setClassroom] = useState("");
  if (!data.term) {
    return <MascotEmptyState pose="schedule" title="ยังไม่มีภาคเรียนที่ใช้งาน" description="เปิดภาคเรียนก่อนเริ่มบันทึกคะแนนความประพฤติ" />;
  }

  const classrooms = [...new Set(data.students.map((student) => student.classroom))].sort();
  const visible = data.students.filter((student) =>
    (!classroom || student.classroom === classroom) &&
    `${student.code} ${student.name}`.toLowerCase().includes(query.trim().toLowerCase()));
  const stats = [
    { label: "นักเรียนในภาคเรียน", value: data.students.length },
    { label: "ต่ำกว่า 50 คะแนน", value: data.students.filter((student) => student.score < 50).length },
    { label: "ตั้งแต่ 100 คะแนน", value: data.students.filter((student) => student.score >= 100).length },
  ];

  return (
    <div className="space-y-5">
      <section aria-label="ภาพรวมคะแนน" className="overflow-hidden rounded-xl border border-line bg-card">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-3 sm:px-5">
          <p className="text-sm font-semibold text-ink-strong">{data.term.name}</p>
          <details className="group w-full text-sm text-muted sm:w-auto sm:max-w-md">
            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-md font-medium text-brand-ink [&::-webkit-details-marker]:hidden">
              เกณฑ์การให้คะแนน <ChevronDown className="size-4 motion-safe:transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className="pb-2 leading-relaxed">เริ่มต้น 100 คะแนนต่อภาคเรียน การเข้าโรงเรียนสายหัก 10 คะแนนต่อวัน ยกเว้นวันที่ครูอนุมัติให้มาสาย</p>
          </details>
        </div>
        <dl className="grid grid-cols-3 divide-x divide-line border-t border-line bg-brand-softer">
          {stats.map(({ label, value }) => (
            <div key={label} className="min-w-0 px-3 py-4 sm:px-5">
              <dt className="text-xs text-muted sm:text-sm">{label}</dt>
              <dd className="mt-1.5 text-2xl font-bold tabular-nums text-ink-strong">{value.toLocaleString("th-TH")}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(16rem,2fr)_minmax(0,3fr)]">
        <section aria-labelledby="behavior-students" className="min-w-0 overflow-hidden rounded-xl border border-line bg-card">
          <div className="space-y-3 border-b border-line px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="behavior-students" className="font-bold text-ink-strong">รายชื่อนักเรียน</h2>
              <p className="text-xs text-muted">{visible.length.toLocaleString("th-TH")} คน</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <label className="relative min-w-0">
                <span className="sr-only">ค้นหานักเรียน</span>
                <Search className="pointer-events-none absolute start-3 top-3.5 size-4 text-muted" aria-hidden="true" />
                <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ชื่อหรือรหัสนักเรียน" className={cn(field, "w-full ps-9")} />
              </label>
              <select aria-label="กรองห้องเรียน" value={classroom} onChange={(event) => setClassroom(event.target.value)} className={cn(field, "w-full min-w-0 sm:max-w-32")}>
                <option value="">ทุกห้อง</option>
                {classrooms.map((code) => <option key={code} value={code}>{code}</option>)}
              </select>
            </div>
          </div>
          {visible.length ? (
            <ul className="max-h-[50dvh] divide-y divide-line overflow-y-auto overscroll-contain">
              {visible.map((student) => {
                const active = data.selectedStudent?.id === student.id;
                return (
                  <li key={student.id}>
                    <Link
                      href={`/dashboard/behavior?student=${encodeURIComponent(student.id)}#behavior-detail`}
                      aria-current={active ? "true" : undefined}
                      className={cn("group flex items-center justify-between gap-3 px-4 py-3 focus-visible:-outline-offset-2 sm:px-5", active ? "bg-brand-soft" : "hover:bg-brand-softer")}
                    >
                      <span className="min-w-0">
                        <span className="block wrap-break-word text-sm font-semibold text-ink-strong">{student.name}</span>
                        <span className="mt-0.5 block wrap-break-word text-xs text-muted">{student.code} · {student.classroom}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className={cn("text-lg font-bold tabular-nums", student.score < 50 ? "text-danger" : "text-brand-ink")}>
                          {student.score}<span className="sr-only"> คะแนน</span>
                        </span>
                        <ArrowRight className="size-4 text-muted group-hover:text-brand" aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : <MascotEmptyState compact pose="students" className="m-4" title="ไม่พบนักเรียน" description="ลองเปลี่ยนคำค้นหาหรือเลือกห้องเรียนอื่น" />}
        </section>

        {data.selectedStudent
          ? <StudentPoints key={data.selectedStudent.id} student={data.selectedStudent} history={data.history} />
          : <section className="flex min-h-40 items-center gap-4 rounded-xl border border-line bg-card px-5 py-6 sm:px-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><ClipboardList className="size-5" aria-hidden="true" /></span>
              <div>
                <h2 className="font-bold text-ink-strong">เลือกนักเรียนจากรายชื่อ</h2>
                <p className="mt-1 text-sm text-muted">ดูคะแนนปัจจุบัน บันทึกคะแนน หรือเปิดประวัติ</p>
              </div>
            </section>}
      </div>
    </div>
  );
}

function StudentPoints({ student, history }: { student: StudentSummary; history: PointHistory[] }): React.ReactNode {
  const router = useRouter();
  const detail = useRef<HTMLElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const [direction, setDirection] = useState<"ADD" | "DEDUCT">("DEDUCT");
  const [points, setPoints] = useState("10");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveReview, setSaveReview] = useState(false);
  const [deleting, setDeleting] = useState<PointHistory | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (window.location.hash === "#behavior-detail") detail.current?.focus({ preventScroll: true });
  }, []);

  const amount = Number(points);
  const validPoints = Number.isInteger(amount) && amount >= 1 && amount <= 100;
  const previousDelta = history.find((entry) => entry.id === editingId)?.delta ?? 0;
  const projectedScore = student.score - previousDelta + amount * (direction === "ADD" ? 1 : -1);

  function resetDraft(): void {
    setEditingId(null);
    setDirection("DEDUCT");
    setPoints("10");
    setTitle("");
    setNote("");
  }

  function save(): void {
    if (pending || !validPoints || title.trim().length < 3) return;
    startTransition(async () => {
      const result = editingId
        ? await updateBehaviorPointsAction({ id: editingId, direction, points: amount, title, note })
        : await addBehaviorPointsAction({ studentId: student.id, direction, points: amount, title, note, requestId: crypto.randomUUID() });
      setSaveReview(false);
      setFeedback(result);
      if (result.ok) {
        resetDraft();
        router.refresh();
      }
    });
  }

  function edit(entry: PointHistory): void {
    setEditingId(entry.id);
    setDirection(entry.delta >= 0 ? "ADD" : "DEDUCT");
    setPoints(String(Math.abs(entry.delta)));
    setTitle(entry.title);
    setNote(entry.note ?? "");
    setFeedback(null);
    titleInput.current?.focus();
  }

  function confirmDelete(): void {
    if (!deleting || pending) return;
    startTransition(async () => {
      const result = await deleteBehaviorPointsAction(deleting.id);
      setFeedback(result);
      setDeleting(null);
      if (result.ok) {
        if (editingId === deleting.id) resetDraft();
        router.refresh();
      }
    });
  }

  return (
    <section id="behavior-detail" aria-labelledby="behavior-student-name" ref={detail} tabIndex={-1} className="min-w-0 scroll-mt-24 overflow-hidden rounded-xl border border-line bg-card">
      <header className="flex flex-wrap items-center justify-between gap-4 bg-brand-softer p-4 sm:px-5">
        <div className="min-w-0">
          <p className="text-xs text-muted">{student.classroom} · {student.code}</p>
          <h2 id="behavior-student-name" className="mt-1 wrap-break-word text-xl font-bold text-ink-strong">{student.name}</h2>
        </div>
        <dl>
          <dt className="text-xs font-medium text-muted">คะแนนปัจจุบัน</dt>
          <dd className="mt-0.5 text-3xl font-bold tabular-nums text-brand-ink">{student.score}</dd>
        </dl>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!pending && validPoints && title.trim().length >= 3) {
            setFeedback(null);
            setSaveReview(true);
          }
        }}
        className="space-y-4 px-4 py-5 sm:px-5"
      >
        <h3 className="font-bold text-ink-strong">{editingId ? "แก้ไขรายการคะแนน" : "บันทึกคะแนน"}</h3>
        {feedback && <p role={feedback.ok ? "status" : "alert"} className={cn("rounded-lg px-3 py-2.5 text-sm", feedback.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>{feedback.message}</p>}
        <fieldset disabled={pending} className="space-y-4 disabled:opacity-70">
          <div className="flex flex-wrap items-end gap-3">
            <div role="group" aria-label="ประเภทการเปลี่ยนคะแนน" className="inline-flex flex-wrap gap-1 rounded-lg bg-surface p-1">
              {([{ key: "DEDUCT", label: "หักคะแนน", Icon: Minus }, { key: "ADD", label: "เพิ่มคะแนน", Icon: Plus }] as const).map(({ key, label, Icon }) => (
                <Button key={key} type="button" variant="ghost" aria-pressed={direction === key} onClick={() => setDirection(key)} className={cn("min-h-10", direction === key && "bg-card text-brand-ink shadow-xs")}>
                  <Icon aria-hidden="true" />{label}
                </Button>
              ))}
            </div>
            <label className="grid gap-1 text-sm font-medium text-ink-strong">
              จำนวนคะแนน
              <input type="number" min={1} max={100} step={1} required value={points} onChange={(event) => setPoints(event.target.value)} className={cn(field, "w-28")} />
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium text-ink-strong">
            เหตุผล
            <input ref={titleInput} required minLength={3} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} className={field} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-ink-strong">
            <span>รายละเอียดเพิ่มเติม <span className="font-normal text-muted">(ไม่บังคับ)</span></span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={2} className={field} />
          </label>
        </fieldset>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-sm text-muted">คะแนนหลังบันทึก <strong className="font-bold tabular-nums text-ink-strong">{validPoints ? projectedScore : "—"}</strong></p>
          <div className="flex flex-wrap gap-2">
            {editingId && <Button type="button" variant="outline" disabled={pending} onClick={resetDraft} className="min-h-11">ยกเลิกการแก้ไข</Button>}
            <Button type="submit" disabled={pending || !validPoints || title.trim().length < 3} className="min-h-11">
              {pending ? "กำลังบันทึก…" : editingId ? "ตรวจการแก้ไข" : `ตรวจรายการ${direction === "ADD" ? "เพิ่ม" : "หัก"}คะแนน`}
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      </form>

      <section aria-labelledby="behavior-history" className="border-t border-line px-4 py-5 sm:px-5">
        <h3 id="behavior-history" className="font-bold text-ink-strong">ประวัติคะแนน</h3>
        {history.length ? (
          <ul className="mt-2 divide-y divide-line">
            {history.map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="wrap-break-word text-sm font-semibold text-ink-strong">{entry.title}</p>
                  {entry.note && <p className="mt-1 wrap-break-word text-sm text-muted">{entry.note}</p>}
                  <p className="mt-1 wrap-break-word text-xs text-muted">{entry.actorName} · {new Date(entry.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })}</p>
                  {entry.canManage && <div className="mt-2 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => edit(entry)} aria-label={`แก้ไข ${entry.title}`} className="min-h-10 text-brand-ink"><Pencil aria-hidden="true" />แก้ไข</Button>
                    <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setDeleting(entry)} aria-label={`ลบ ${entry.title}`} className="min-h-10 text-danger"><Trash2 aria-hidden="true" />ลบ</Button>
                  </div>}
                </div>
                <span className={cn("shrink-0 font-bold tabular-nums", pointTone(entry.delta))}>{signed(entry.delta)}<span className="sr-only"> คะแนน</span></span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-muted">ยังไม่มีรายการ คะแนนเริ่มต้น 100 คะแนน</p>}
      </section>

      <ConfirmDialog open={saveReview} title="ยืนยันบันทึกคะแนน" message={`${student.name} · ${direction === "ADD" ? "เพิ่ม" : "หัก"} ${points} คะแนน · ${title} · คะแนนรวม ${student.score} → ${projectedScore}`} confirmLabel="ยืนยันบันทึก" pending={pending} onConfirm={save} onClose={() => setSaveReview(false)} />
      <ConfirmDialog open={deleting !== null} title="ลบรายการคะแนนที่บันทึกผิด" message={deleting ? `ลบ “${deleting.title}” (${signed(deleting.delta)} คะแนน) ของ ${student.name} และคำนวณคะแนนรวมใหม่` : ""} confirmLabel="ลบรายการ" destructive pending={pending} onConfirm={confirmDelete} onClose={() => setDeleting(null)} />
    </section>
  );
}
