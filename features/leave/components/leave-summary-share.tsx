"use client";

import { useRef, useState } from "react";
import { Copy, MessageSquareText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LeaveDailyReport } from "@/features/leave/daily-report";
import { createLeaveSummaryMessage, splitLeaveSummaryMessage } from "@/features/leave/summary-message";

export default function LeaveSummaryShare({ report }: { report: LeaveDailyReport }): React.ReactNode {
  const [open, setOpen] = useState(false);
  const [includeNames, setIncludeNames] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [part, setPart] = useState(0);
  const [message, setMessage] = useState("");
  const [copying, setCopying] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const text = draft ?? createLeaveSummaryMessage(report, includeNames);
  const parts = splitLeaveSummaryMessage(text);
  const current = Math.min(part, parts.length - 1);

  async function copy(): Promise<void> {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(parts[current]);
      setMessage(parts.length > 1 ? `คัดลอกตอนที่ ${current + 1}/${parts.length} แล้ว นำไปวางใน LINE แล้วกลับมาคัดลอกตอนถัดไป` : "คัดลอกข้อความแล้ว เปิดแชท LINE ที่ต้องการแล้วกดวางได้เลย");
    } catch {
      textarea.current?.focus();
      const start = parts.slice(0, current).join("").length;
      textarea.current?.setSelectionRange(start, start + parts[current].length);
      setMessage("คัดลอกอัตโนมัติไม่ได้ เลือกข้อความไว้ให้แล้ว กรุณากดคัดลอกด้วยตัวเอง");
    } finally { setCopying(false); }
  }

  return <>
    <button type="button" onClick={() => { setOpen(true); setDraft(null); setIncludeNames(false); setPart(0); setMessage(""); }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-brand/30 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand-ink"><MessageSquareText size={17} aria-hidden="true" />คัดลอกสรุปสำหรับส่ง LINE</button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>ข้อความสรุปสำหรับส่ง LINE</DialogTitle><DialogDescription>สรุปตามวันที่เลือกเหมือนกราฟด้านบน ไม่เปลี่ยนตามตัวกรองหรือหน้ารายชื่อ · คัดลอกแล้วนำไปส่งในแชทที่ต้องการเอง</DialogDescription></DialogHeader>
        <label className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3 text-sm"><input type="checkbox" checked={includeNames} onChange={event => { setIncludeNames(event.target.checked); setDraft(null); setPart(0); setMessage(""); }} className="mt-0.5 h-4 w-4 shrink-0" /><span><strong className="font-semibold">แนบรายชื่อนักเรียนแยกห้อง</strong><span className="mt-1 block text-xs text-muted">เฉพาะรอพิจารณาและอนุมัติ · ไม่แนบเหตุผลลา ชื่อ LINE หรือรหัสบัญชีผู้ส่ง</span></span></label>
        <label htmlFor="leave-share-draft" className="text-sm font-semibold text-ink">ตรวจและแก้ไขข้อความก่อนคัดลอก</label>
        <textarea ref={textarea} id="leave-share-draft" value={text} onChange={event => { setDraft(event.target.value); setPart(0); setMessage(""); }} rows={13} className="min-h-48 w-full rounded-xl border border-line bg-surface p-3 text-sm leading-relaxed text-ink" />
        {parts.length > 1 && <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>ข้อความยาว แบ่งคัดลอก {parts.length} ตอน · กำลังเลือกตอน {current + 1}</span><div className="flex gap-2"><button type="button" disabled={current === 0 || copying} onClick={() => { setPart(current - 1); setMessage(""); }} className="min-h-10 rounded-lg border border-line px-3 disabled:opacity-40">ตอนก่อน</button><button type="button" disabled={current === parts.length - 1 || copying} onClick={() => { setPart(current + 1); setMessage(""); }} className="min-h-10 rounded-lg border border-line px-3 disabled:opacity-40">ตอนถัดไป</button></div></div>}
        {message && <p role="status" className="rounded-lg bg-brand-soft p-3 text-sm text-brand-ink">{message}</p>}
        <DialogFooter><button type="button" onClick={() => setOpen(false)} className="min-h-10 rounded-lg border border-line px-4 py-2 text-sm font-semibold">ปิด</button><button type="button" disabled={copying || !text.trim()} onClick={() => void copy()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"><Copy size={16} aria-hidden="true" />{copying ? "กำลังคัดลอก…" : parts.length > 1 ? `คัดลอกตอนที่ ${current + 1}` : "คัดลอกข้อความ"}</button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
