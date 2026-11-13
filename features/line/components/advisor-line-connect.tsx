"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy, ExternalLink, RefreshCw } from "lucide-react";

interface Props {
  linked: boolean;
  currentCode: string | null;
  friendUrl: string | null;
  friendQr: string | null;
  advisoryRooms: string[];
  sendTime: string;
}

export default function AdvisorLineConnect({ linked, currentCode, friendUrl, friendQr, advisoryRooms, sendTime }: Props): React.ReactNode {
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

  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-7">
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${linked ? "bg-success-soft text-success" : code ? "bg-warning-soft text-warning" : "bg-surface-2 text-muted"}`}>
        {linked && <CheckCircle2 className="size-4" />}{linked ? "เชื่อม LINE แล้ว" : code ? "รอส่งรหัสใน LINE" : "ยังไม่เชื่อม LINE"}
      </div>
      {linked ? <>
        <h2 className="mt-5 text-xl font-bold text-ink-strong">เชื่อมสำเร็จแล้ว</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">เมื่อถึงเวลาที่โรงเรียนตั้งไว้ คุณจะได้รับสรุปการเข้าโรงเรียนของห้องที่ปรึกษาทาง LINE OA</p>
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
  </div>;
}
