"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, CalendarClock, CheckCircle2, ClipboardCheck, Copy, ExternalLink, RefreshCw, School, UsersRound } from "lucide-react";
import SemanticStatusBadge from "@/components/ui/semantic-status-badge";

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
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (linked) return;
    const timer = window.setInterval(() => router.refresh(), 10_000);
    return () => window.clearInterval(timer);
  }, [linked, router]);

  async function copyCode(): Promise<void> {
    if (!currentCode) return;
    try { await navigator.clipboard.writeText(currentCode); setMessage("คัดลอกรหัสแล้ว"); }
    catch { setMessage("คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกรหัสแล้วคัดลอกเอง"); }
  }

  return <div className="flex flex-col gap-3 xl:min-h-0 xl:flex-1">
    <section aria-label="ภาพรวม LINE ของครู" className="grid gap-3 sm:grid-cols-3">
      <div className="flex items-center gap-3 rounded-[20px] border border-blue-100 bg-white p-3 shadow-[0_6px_20px_#225a9a0a]"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#1769b3]"><School className="size-5" /></span><div><p className="text-xs text-muted">ห้องที่ปรึกษา</p><p className="text-2xl font-bold tabular text-ink-strong">{advisoryRooms.length} <span className="text-xs font-medium">ห้อง</span></p></div></div>
      <div className="flex items-center gap-3 rounded-[20px] border border-blue-100 bg-white p-3 shadow-[0_6px_20px_#225a9a0a]"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><UsersRound className="size-5" /></span><div><p className="text-xs text-muted">นักเรียนที่ดูแล</p><p className="text-2xl font-bold tabular text-ink-strong">{studentCount.toLocaleString("th-TH")} <span className="text-xs font-medium">คน</span></p></div></div>
      <Link href="/dashboard/leave-requests" className="flex items-center gap-3 rounded-[20px] border border-blue-100 bg-white p-3 shadow-[0_6px_20px_#225a9a0a] hover:border-[#1769b3]"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><ClipboardCheck className="size-5" /></span><div className="flex-1"><p className="text-xs text-muted">คำขอลารอตรวจ</p><p className="text-2xl font-bold tabular text-ink-strong">{pendingLeaveCount.toLocaleString("th-TH")} <span className="text-xs font-medium">รายการ</span></p></div><ArrowRight className="size-4 text-[#1769b3]" /></Link>
    </section>

    <div className="grid gap-3 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <section aria-label="บัญชีและการเชื่อมต่อ" className="min-w-0 rounded-[22px] border border-blue-100 bg-white p-4 shadow-[0_8px_24px_#225a9a0d] xl:overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-bold text-ink-strong">บัญชีและการเชื่อมต่อ</h2><SemanticStatusBadge tone={linked ? "success" : currentCode ? "warning" : "neutral"}>{linked ? "เชื่อม LINE แล้ว" : currentCode ? "รอส่งรหัส" : "ยังไม่เชื่อม LINE"}</SemanticStatusBadge></div>
        {linked ? <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3"><p className="flex items-center gap-2 font-bold text-emerald-800"><CheckCircle2 className="size-5" /> เชื่อมบัญชีสำเร็จ</p><p className="mt-1 text-sm leading-6 text-ink">{advisoryRooms.length ? `ระบบสามารถส่งสรุปของ ${advisoryRooms.join(", ")} ตามเวลาที่โรงเรียนตั้งไว้` : "บัญชี LINE เชื่อมแล้ว แต่ยังไม่มีห้องที่ปรึกษา จึงยังไม่มีสรุปรายห้อง"} คุณยังรับประกาศที่โรงเรียนส่งถึงครูได้</p></div> : <>
          <p className="mt-3 text-sm leading-6 text-ink">เพิ่มเพื่อน LINE OA ของโรงเรียน แล้วส่งรหัส 6 หลักที่แอดมินออกให้ในแชทส่วนตัว ระบบจะตรวจสถานะให้อัตโนมัติ</p>
          {currentCode ? <div className="mt-3 flex flex-wrap items-center gap-2"><span className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 font-mono text-2xl font-bold tracking-[0.18em] text-[#0b4385] select-all">{currentCode}</span><button type="button" onClick={copyCode} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-blue-200 px-3 text-sm font-semibold text-[#0b4385] hover:bg-blue-50"><Copy className="size-4" /> คัดลอก</button></div> : <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">แอดมินยังไม่ออกรหัสให้คุณ กรุณาติดต่อผู้ดูแลระบบ</p>}
          {friendUrl ? <div className="mt-3 flex items-center gap-3 rounded-xl border border-blue-100 bg-[#f8fbff] p-3">{friendQr && <Image src={friendQr} alt="QR เพิ่มเพื่อน LINE OA ของโรงเรียน" width={80} height={80} unoptimized className="rounded-lg bg-white p-1" />}<a href={friendUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#1769b3] px-3 text-sm font-semibold text-white hover:bg-[#0b4385]"><ExternalLink className="size-4" /> เปิด LINE OA</a></div> : <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">ยังไม่ได้ตั้งลิงก์เพิ่มเพื่อน LINE OA กรุณาขอลิงก์จากผู้ดูแลระบบ</p>}
          <button type="button" onClick={() => router.refresh()} className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#1769b3]"><RefreshCw className="size-4" /> ตรวจสถานะตอนนี้</button>
        </>}
        {linked && friendUrl && <a href={friendUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-blue-200 px-3 text-sm font-semibold text-[#0b4385] hover:bg-blue-50"><ExternalLink className="size-4" /> เปิด LINE OA โรงเรียน</a>}
        {message && <p role="status" className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-ink">{message}</p>}
      </section>

      <div className="flex min-w-0 flex-col gap-3 xl:min-h-0 xl:overflow-y-auto">
        <section className="rounded-[22px] border border-blue-100 bg-white p-4 shadow-[0_8px_24px_#225a9a0d]"><h2 className="text-base font-bold text-ink-strong">ห้องที่ปรึกษาและเวลาส่งสรุป</h2><div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="rounded-xl bg-blue-50 p-3"><p className="flex items-center gap-1.5 text-xs text-muted"><School className="size-4" /> ห้องที่ปรึกษา</p><p className="mt-1 font-bold text-[#0b4385]">{advisoryRooms.length ? advisoryRooms.join(", ") : "ยังไม่มีห้องที่ปรึกษา"}</p></div><div className="rounded-xl bg-blue-50 p-3"><p className="flex items-center gap-1.5 text-xs text-muted"><CalendarClock className="size-4" /> เวลาส่งสรุป</p><p className="mt-1 font-bold text-[#0b4385]">{sendTime} น.</p><p className="text-xs text-muted">จันทร์–ศุกร์ · เวลาไทย</p></div></div>{!hasActiveTerm && <p className="mt-2 text-xs text-amber-800">ยังไม่มีภาคเรียนที่เปิดใช้งาน</p>}</section>
        <section className="rounded-[22px] border border-blue-100 bg-white p-4 shadow-[0_8px_24px_#225a9a0d]"><h2 className="text-base font-bold text-ink-strong">การแจ้งเตือนและงานที่เกี่ยวข้อง</h2><div className="mt-3 grid gap-2 text-sm"><p className="flex items-center gap-2 text-ink"><Bell className="size-4 text-[#1769b3]" /> สรุปการเข้าโรงเรียน · คำขอลา · ประกาศ</p><Link href="/dashboard/leave-requests" className="flex min-h-10 items-center justify-between rounded-xl border border-blue-100 px-3 font-semibold text-[#0b4385] hover:bg-blue-50">ตรวจคำขอลา <ArrowRight className="size-4" /></Link><Link href="/dashboard/attendance?mode=homeroom" className="flex min-h-10 items-center justify-between rounded-xl border border-blue-100 px-3 font-semibold text-[#0b4385] hover:bg-blue-50">ดูการเช็กชื่อประจำห้อง <ArrowRight className="size-4" /></Link></div><p className="mt-2 text-xs leading-5 text-muted">หากเชื่อมแล้วแต่ไม่ได้รับข้อความ ให้ตรวจการบล็อก LINE OA และสถานะการส่งของโรงเรียน</p></section>
      </div>
    </div>
  </div>;
}
