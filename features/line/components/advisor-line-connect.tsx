"use client";

import Image from "next/image";
import WorkspacePanels from "@/features/dashboard/components/workspace-panels";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy, ExternalLink, RefreshCw, UsersRound, ClipboardCheck, Bell, ArrowRight } from "lucide-react";

interface Props {
  linked: boolean;
  currentCode: string | null;
  friendUrl: string | null;
  friendQr: string | null;
  advisoryRooms: string[];
  sendTime: string;
  studentCount: number;
  pendingLeaveCount: number;
  hasActiveTerm: boolean;
}

export default function AdvisorLineConnect({ linked, currentCode, friendUrl, friendQr, advisoryRooms, sendTime, studentCount, pendingLeaveCount, hasActiveTerm }: Props): React.ReactNode {
  const router = useRouter();
  const code = currentCode;
  const [message, setMessage] = useState("");

  // The teacher can leave this page open while sending the code in LINE.
  useEffect(() => {
    if (linked) return;
    const timer = window.setInterval(() => router.refresh(), 10_000);
    return () => window.clearInterval(timer);
  }, [linked, router]);

  async function copyCode(): Promise<void> {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); setMessage("คัดลอกรหัสแล้ว"); }
    catch { setMessage("คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกรหัสแล้วคัดลอกเอง"); }
  }

  return <div className="space-y-5">
    <section aria-label="ภาพรวม LINE ของครู" className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-line bg-card p-4 shadow-sm"><p className="text-sm text-muted">ห้องที่ปรึกษา</p><p className="mt-2 text-3xl font-bold tabular text-ink-strong">{advisoryRooms.length}</p><p className="mt-1 text-xs text-muted">ห้องในปีการศึกษาปัจจุบัน</p></div>
      <div className="rounded-2xl border border-line bg-card p-4 shadow-sm"><p className="text-sm text-muted">นักเรียนที่ดูแล</p><p className="mt-2 text-3xl font-bold tabular text-brand-ink">{studentCount.toLocaleString("th-TH")}</p><p className="mt-1 text-xs text-muted">{hasActiveTerm ? "คนในภาคเรียนปัจจุบัน" : "ยังไม่มีภาคเรียนที่เปิดใช้งาน"}</p></div>
      <Link href="/dashboard/leave-requests" className="group rounded-2xl border border-line bg-card p-4 shadow-sm transition-colors hover:border-brand/40 hover:bg-brand-softer"><p className="flex items-center justify-between text-sm text-muted">คำขอลารอตรวจ <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></p><p className="mt-2 text-3xl font-bold tabular text-warning">{pendingLeaveCount.toLocaleString("th-TH")}</p><p className="mt-1 text-xs text-muted">รายการจากห้องที่ปรึกษาของคุณ</p></Link>
    </section>
    <WorkspacePanels sections={[{ title: "บัญชีและการเชื่อมต่อ", description: "สถานะ รหัส และ QR เพิ่มเพื่อน", content: <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-7">
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${linked ? "bg-success-soft text-success" : code ? "bg-warning-soft text-warning" : "bg-surface-2 text-muted"}`}>
        {linked && <CheckCircle2 className="size-4" />}{linked ? "เชื่อม LINE แล้ว" : code ? "รอส่งรหัสใน LINE" : "ยังไม่เชื่อม LINE"}
      </div>
      {linked ? <>
        <h2 className="mt-5 text-xl font-bold text-ink-strong">เชื่อมสำเร็จแล้ว</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{advisoryRooms.length ? `คุณจะได้รับสรุปการเข้าโรงเรียนของ ${advisoryRooms.join(", ")} ตามเวลาที่โรงเรียนตั้งไว้` : "คุณเชื่อม LINE แล้ว แต่ยังไม่มีห้องที่ปรึกษา จึงยังไม่มีสรุปรายห้องที่จะส่ง"} คุณยังรับประกาศที่โรงเรียนส่งถึงครูได้</p>
        {friendUrl && <a href={friendUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-brand-ink"><ExternalLink className="size-4" /> เปิด LINE OA โรงเรียน</a>}
      </> : <>
        <h2 className="mt-5 text-xl font-bold text-ink-strong">เชื่อมบัญชี LINE ของคุณ</h2>
        <ol className="mt-4 space-y-3 text-sm leading-relaxed text-ink">
          <li><span className="mr-2 font-bold text-brand-ink">1.</span>เพิ่มเพื่อน LINE Official Account ของโรงเรียน</li>
          <li><span className="mr-2 font-bold text-brand-ink">2.</span>รับรหัส 6 หลักที่แอดมินออกให้ แล้วส่งรหัสในแชทส่วนตัวกับ LINE OA</li>
          <li><span className="mr-2 font-bold text-brand-ink">3.</span>รอข้อความยืนยัน หน้านี้จะเปลี่ยนเป็น “เชื่อม LINE แล้ว” โดยอัตโนมัติ</li>
        </ol>
        {friendUrl ? <div className="mt-5 flex flex-wrap items-center gap-5 rounded-xl border border-line bg-surface p-4">
          {friendQr && <Image src={friendQr} alt="คิวอาร์โค้ดเพิ่มเพื่อน LINE OA ของโรงเรียน" width={136} height={136} unoptimized className="rounded-lg bg-white p-1" />}
          <div><p className="text-sm font-semibold text-ink">เพิ่มเพื่อน LINE OA</p><a href={friendUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"><ExternalLink className="size-4" /> เปิด LINE เพื่อเพิ่มเพื่อน</a></div>
        </div> : <p className="mt-5 rounded-xl bg-warning-soft p-4 text-sm text-ink">ยังไม่ได้ตั้งลิงก์เพิ่มเพื่อน LINE OA กรุณาขอลิงก์หรือ QR จากผู้ดูแลระบบ</p>}
        <div className="mt-6 border-t border-line pt-5">
          <p className="text-sm font-semibold text-ink">รหัสเชื่อม LINE ของฉัน</p>
          {code ? <div className="mt-2 flex flex-wrap items-center gap-3"><span className="rounded-xl border border-brand/30 bg-brand-soft px-5 py-3 font-mono text-3xl font-bold tracking-[0.22em] text-brand-ink select-all">{code}</span><button type="button" onClick={copyCode} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink"><Copy className="size-4" /> คัดลอก</button></div> : <p className="mt-2 text-sm text-muted">แอดมินยังไม่ออกรหัสให้คุณ กรุณาติดต่อผู้ดูแลระบบ</p>}
        </div>
      </>}
      {message && <p role="status" className="mt-4 rounded-lg bg-brand-soft px-3 py-2 text-sm text-ink">{message}</p>}
    </section>
    <aside className="space-y-4">
      <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
        <p className="text-sm font-semibold text-muted">ห้องที่ปรึกษาของคุณ</p>
        {advisoryRooms.length ? <p className="mt-2 text-lg font-bold text-ink-strong">{advisoryRooms.join(", ")}</p> : <p className="mt-2 text-sm text-warning">ยังไม่ได้รับมอบหมายห้องที่ปรึกษา จึงยังไม่มีสรุปที่จะส่ง</p>}
      </div>
      <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
        <p className="text-sm font-semibold text-muted">เวลาส่งสรุป</p>
        <p className="mt-2 text-2xl font-bold tabular text-brand-ink">{sendTime} น.</p>
        <p className="mt-1 text-xs text-muted">วันจันทร์–ศุกร์ · เวลาไทย · ผู้ดูแลระบบเป็นผู้ตั้งค่า</p>
      </div>
      {!linked && <button type="button" onClick={() => router.refresh()} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-ink"><RefreshCw className="size-4" /> ตรวจสถานะตอนนี้</button>}
    </aside>
    </div> }, { title: "การแจ้งเตือนและงานที่เกี่ยวข้อง", description: "สิ่งที่ได้รับและทางลัดงานที่ปรึกษา", content: <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-bold text-ink-strong">LINE นี้ใช้รับอะไรบ้าง</h2>
        <ul className="mt-4 space-y-3 text-sm text-ink">
          <li className="flex gap-3"><UsersRound className="mt-0.5 size-5 shrink-0 text-brand-ink" /><span><b>สรุปการเข้าโรงเรียน</b><br /><span className="text-muted">ส่งวันจันทร์–ศุกร์ตามเวลาที่โรงเรียนกำหนด เมื่อมีห้องที่ปรึกษา</span></span></li>
          <li className="flex gap-3"><ClipboardCheck className="mt-0.5 size-5 shrink-0 text-brand-ink" /><span><b>แจ้งคำขอลาของนักเรียน</b><br /><span className="text-muted">ตรวจรายละเอียดและพิจารณาคำขอในหน้าคำขอลา</span></span></li>
          <li className="flex gap-3"><Bell className="mt-0.5 size-5 shrink-0 text-brand-ink" /><span><b>ประกาศจากโรงเรียน</b><br /><span className="text-muted">ข่าวสารและเหตุฉุกเฉินที่ส่งถึงบัญชี LINE ที่ผูกแล้ว</span></span></li>
        </ul>
      </section>
      <section className="rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-bold text-ink-strong">งานที่เกี่ยวข้อง</h2>
        <p className="mt-1 text-sm text-muted">เปิดงานบนเว็บไซต์ได้โดยตรง แม้ยังไม่ได้อ่านข้อความใน LINE</p>
        <div className="mt-4 grid gap-2">
          <Link href="/dashboard/leave-requests" className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm font-semibold text-brand-ink hover:bg-brand-softer">ตรวจคำขอลา <ArrowRight className="size-4" /></Link>
          <Link href="/dashboard/attendance?mode=homeroom" className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm font-semibold text-brand-ink hover:bg-brand-softer">ดูการเช็คชื่อประจำห้อง <ArrowRight className="size-4" /></Link>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted">หากเชื่อมแล้วแต่ไม่เห็นข้อความ ให้ตรวจว่าไม่ได้บล็อก LINE OA และเปิดการแจ้งเตือน LINE ไว้ หากยังมีปัญหาให้แจ้งผู้ดูแลระบบ</p>
      </section>
    </div> }]} />
  </div>;
}
