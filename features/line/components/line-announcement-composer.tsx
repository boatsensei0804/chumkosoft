"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Megaphone, Send } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { sendLineAnnouncementAction, retryLineAnnouncementAction } from "@/features/line/announcement-actions";
import { announcementText } from "@/features/line/announcement-text";
import type { LineAnnouncementKind } from "@prisma/client";

interface HistoryItem {
  id: string;
  kind: LineAnnouncementKind;
  title: string;
  recipientCount: number;
  accepted: number;
  failed: boolean;
  errorCode: string | null;
  createdAt: string;
}

function failureLabel(code: string | null): string {
  if (code === "HTTP_401") return "LINE ปฏิเสธโทเคน (401)";
  if (code === "HTTP_403") return "โทเคนไม่มีสิทธิ์ส่ง (403)";
  if (code === "HTTP_429") return "โควตาหรืออัตราส่ง LINE เต็ม";
  if (code === "NETWORK_ERROR") return "เครือข่ายขัดข้อง";
  if (code === "HTTP_400") return "คำขอไม่ถูกต้อง";
  return code ? `LINE ตอบ ${code}` : "รอส่งต่อ";
}

export default function LineAnnouncementComposer({ recipientCount, configured, history }: { recipientCount: number; configured: boolean; history: HistoryItem[] }): React.ReactNode {
  const router = useRouter();
  const [kind, setKind] = useState<LineAnnouncementKind>("NEWS");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [pending, startTransition] = useTransition();
  const preview = announcementText(kind, title.trim(), body.trim());
  const valid = title.trim().length > 0 && title.trim().length <= 120 && body.trim().length > 0 && body.trim().length <= 3000 && preview.length <= 5000;

  function submit(): void {
    if (!confirmed || !valid || pending) return;
    startTransition(async () => {
      const result = await sendLineAnnouncementAction({ requestKey, kind, title, body, expectedRecipients: recipientCount });
      setFeedback(result.message);
      setReviewOpen(false);
      setConfirmed(false);
      if (result.id) {
        setTitle("");
        setBody("");
        setKind("NEWS");
        setRequestKey(crypto.randomUUID());
      }
      router.refresh();
    });
  }

  function retry(id: string): void {
    if (pending) return;
    startTransition(async () => {
      const result = await retryLineAnnouncementAction(id);
      setFeedback(result.message);
      router.refresh();
    });
  }

  return <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
      <section className="rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-ink-strong">เขียนประกาศ</h2>
        <p className="mt-1 text-sm text-muted">ตรวจข้อความและจำนวนผู้รับก่อนส่งจริง</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2" role="group" aria-label="ประเภทประกาศ">
          <button type="button" aria-pressed={kind === "NEWS"} onClick={() => setKind("NEWS")}
            className={`flex items-center gap-3 rounded-xl border p-3 text-left text-sm font-semibold ${kind === "NEWS" ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-ink"}`}>
            <Megaphone className="size-5" /> ข่าวสารทั่วไป
          </button>
          <button type="button" aria-pressed={kind === "EMERGENCY"} onClick={() => setKind("EMERGENCY")}
            className={`flex items-center gap-3 rounded-xl border p-3 text-left text-sm font-semibold ${kind === "EMERGENCY" ? "border-danger bg-danger-soft text-danger" : "border-line text-ink"}`}>
            <AlertTriangle className="size-5" /> เหตุฉุกเฉิน
          </button>
        </div>
        <label className="mt-5 block text-sm font-semibold text-ink" htmlFor="line-announcement-title">หัวข้อ</label>
        <input id="line-announcement-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120}
          placeholder="เช่น แจ้งเปลี่ยนเวลาเลิกเรียน" className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-brand" />
        <div className="mt-5 flex items-end justify-between gap-3">
          <label className="text-sm font-semibold text-ink" htmlFor="line-announcement-body">รายละเอียด</label>
          <span className="text-xs tabular text-muted">{body.length}/3000</span>
        </div>
        <textarea id="line-announcement-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={3000} rows={7}
          placeholder="ระบุสิ่งที่เกิดขึ้น เวลา สถานที่ และสิ่งที่ผู้รับควรทำ" className="mt-1.5 w-full resize-y rounded-xl border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-ink outline-none focus:border-brand" />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">ส่งถึงบัญชี LINE ที่ผูกกับระบบเท่านั้น · นับบัญชีที่ซ้ำเพียงครั้งเดียว</p>
          <button type="button" disabled={!configured || recipientCount === 0 || !valid || pending} onClick={() => { setConfirmed(false); setReviewOpen(true); }}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            <Send className="size-4" /> ตรวจสอบก่อนส่ง
          </button>
        </div>
      </section>
      <aside className="space-y-4">
        <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold text-muted">ผู้รับที่เชื่อม LINE แล้ว</p>
          <p className="mt-2 text-4xl font-bold tabular text-brand-ink">{recipientCount.toLocaleString("th-TH")}</p>
          <p className="mt-1 text-xs text-muted">บัญชี LINE ไม่ซ้ำ · ผูกกับนักเรียนหรือครูในระบบ</p>
        </div>
        {!configured && <div className="rounded-2xl border border-warning bg-warning-soft p-4 text-sm text-ink">ยังไม่ได้ตั้งค่า LINE Channel access token บนเซิร์ฟเวอร์ จึงยังส่งประกาศไม่ได้</div>}
        <div className="rounded-2xl border border-line bg-card p-5 text-sm leading-relaxed text-muted shadow-sm">
          <p className="font-semibold text-ink">ก่อนส่ง</p>
          <p className="mt-2">ตรวจวัน เวลา และข้อความให้ชัดเจน โดยเฉพาะประกาศเหตุฉุกเฉิน ข้อความที่ส่งมีผลต่อโควตาของ LINE OA</p>
        </div>
      </aside>
    </div>

    {feedback && <div role="status" className="rounded-xl border border-line bg-brand-soft px-4 py-3 text-sm font-semibold text-ink">{feedback}</div>}

    {history.some((item) => item.errorCode === "HTTP_401" || item.errorCode === "HTTP_403") && <div className="rounded-xl border border-warning bg-warning-soft px-4 py-3 text-sm text-ink">
      LINE ปฏิเสธ Channel access token บนเซิร์ฟเวอร์ กรุณาสร้างโทเคนใหม่จาก Messaging API ของ OA ที่ใช้งาน แล้วแก้ <code>LINE_CHANNEL_ACCESS_TOKEN</code> ในไฟล์ <code>.env</code> บนเซิร์ฟเวอร์ จากนั้นสร้างคอนเทนเนอร์แอปใหม่และกด “ลองส่งต่อ” ไม่ต้องสร้างประกาศซ้ำ
    </div>}

    <section className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
      <div className="border-b border-line px-5 py-4"><h2 className="text-base font-bold text-ink-strong">รายการส่งล่าสุด</h2></div>
      {history.length === 0 ? <p className="px-5 py-10 text-center text-sm text-muted">ยังไม่มีประกาศที่ส่งผ่าน LINE</p> :
        <div className="divide-y divide-line">{history.map((item) => {
          const remaining = item.recipientCount - item.accepted;
          return <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.kind === "EMERGENCY" ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand-ink"}`}>{item.kind === "EMERGENCY" ? "เหตุฉุกเฉิน" : "ข่าวสาร"}</span>
                <span className="font-semibold text-ink-strong">{item.title}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{new Date(item.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })}{remaining > 0 ? ` · ${failureLabel(item.errorCode)}` : ""}</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className={remaining === 0 ? "text-success" : "text-warning"}>{remaining === 0 ? <CheckCircle2 className="mr-1 inline size-4" /> : null}LINE รับแล้ว {item.accepted}/{item.recipientCount}</span>
              {remaining > 0 && <button type="button" disabled={pending || !configured} onClick={() => retry(item.id)} className="rounded-lg border border-line px-3 py-1.5 font-semibold text-brand-ink disabled:opacity-50">{item.failed ? "ลองส่งต่อ" : "ส่งต่อ"}</button>}
            </div>
          </div>;
        })}</div>}
    </section>

    <Dialog open={reviewOpen} onOpenChange={(open) => !pending && setReviewOpen(open)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>ตรวจประกาศก่อนส่ง</DialogTitle>
          <DialogDescription>LINE จะได้รับคำขอส่งข้อความนี้ถึง {recipientCount.toLocaleString("th-TH")} บัญชี</DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto rounded-xl bg-surface p-3">
          <div className="overflow-hidden rounded-xl border border-line bg-card shadow-sm">
            <div className={`px-4 py-3 text-sm font-bold text-white ${kind === "EMERGENCY" ? "bg-danger" : "bg-brand"}`}>{kind === "EMERGENCY" ? "แจ้งเหตุฉุกเฉิน" : "ข่าวสารจากโรงเรียน"}</div>
            <div className="space-y-3 px-4 py-4"><p className="text-base font-bold text-ink-strong">{title.trim()}</p><div className="border-t border-line" /><p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{body.trim()}</p></div>
            <p className="px-4 pb-3 text-right text-[11px] font-semibold tracking-wide text-muted">CHUMKOSOFT SCHOOL</p>
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm text-ink">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />
          <span>ฉันตรวจข้อความและจำนวนผู้รับแล้ว</span>
        </label>
        <DialogFooter>
          <button type="button" disabled={pending} onClick={() => setReviewOpen(false)} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink">กลับไปแก้ไข</button>
          <button type="button" disabled={!confirmed || pending} onClick={submit}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${kind === "EMERGENCY" ? "bg-danger" : "bg-brand"}`}>
            {pending ? "กำลังส่ง…" : `ยืนยันส่งถึง ${recipientCount.toLocaleString("th-TH")} บัญชี`}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
