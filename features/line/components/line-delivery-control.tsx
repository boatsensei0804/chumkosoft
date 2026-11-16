"use client";
import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { saveLineDeliveryAction } from "@/features/line/delivery-actions";
import type { LineDeliveryState } from "@/features/line/services/line-delivery-settings";
export default function LineDeliveryControl({ initial, canManage }: { initial: LineDeliveryState; canManage: boolean }): React.ReactNode {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const id = useId();
  const router = useRouter();
  function change(value: boolean): void {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await saveLineDeliveryAction(value);
        setMessage(result.message);
        if (result.ok && result.state) { setEnabled(result.state.enabled); router.refresh(); }
      } catch {
        setMessage("เชื่อมต่อไม่สำเร็จ กรุณาโหลดหน้าเพื่อตรวจสถานะล่าสุด");
      }
    });
  }
  return <section aria-label="ควบคุมการส่ง LINE" className={`mb-5 rounded-2xl border p-4 sm:p-5 ${enabled && initial.available ? "border-blue-100 bg-blue-50/40" : "border-amber-200 bg-amber-50/60"}`}>
    <div className="flex flex-wrap items-center justify-between gap-4"><div className="min-w-0 flex-1"><h2 className="font-bold text-ink-strong">การส่งแจ้งเตือน LINE</h2><p className="mt-1 text-sm font-semibold text-brand-ink">{!initial.available ? "ตรวจสถานะไม่ได้ — พักการส่งไว้ชั่วคราว" : enabled ? "เปิดการส่งอยู่" : "พักการส่งอยู่"}</p></div>{canManage && <div className="flex min-h-11 items-center gap-3"><label htmlFor={id} className="cursor-pointer text-sm font-semibold text-ink">{pending ? "กำลังบันทึก…" : enabled ? "เปิด" : "ปิด"}</label><Switch id={id} checked={enabled && initial.available} onCheckedChange={change} disabled={pending || !initial.available} aria-label="เปิดหรือพักการส่งแจ้งเตือน LINE" /></div>}</div>
    <p className="mt-3 text-sm leading-6 text-ink">ปิดเพื่อพักแจ้งเข้าโรงเรียน ประกาศ ผลพิจารณาคำขอ และแจ้งเตือนครูทั้งหมด · ระบบเช็กชื่อยังบันทึกข้อมูลตามปกติ</p>
    <p className="mt-2 text-xs leading-5 text-muted">ผู้ปกครองยังผูกบัญชี แจ้งลา และดูสถานะผ่านเมนู LINE ได้ · มีผลกับคำขอส่งใหม่หลังบันทึก ข้อความที่ LINE รับไปแล้วอาจยังส่งถึงผู้รับ</p>
    <p className="mt-1 text-xs leading-5 text-muted">เปิดอีกครั้งจะไม่ส่งแจ้งเข้าโรงเรียนย้อนหลังอัตโนมัติ · ประกาศที่ค้างต้องกดส่งต่อเอง{!canManage ? " · เฉพาะแอดมินเปลี่ยนสถานะได้" : ""}</p>
    {!initial.available && <button type="button" onClick={() => router.refresh()} className="mt-3 min-h-10 rounded-lg border border-line px-3 text-sm font-semibold">ตรวจสถานะอีกครั้ง</button>}
    {message && <p role="status" className="mt-3 rounded-lg bg-white/70 p-3 text-sm font-semibold text-ink">{message}</p>}
  </section>;
}
