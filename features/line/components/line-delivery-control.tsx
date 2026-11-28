"use client";
import { useId, useState, useTransition } from "react";
import { Bell, CircleAlert, CircleCheck, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const StatusIcon = !initial.available ? CircleAlert : enabled ? CircleCheck : Pause;
  const status = !initial.available ? "ตรวจสถานะไม่ได้" : enabled ? "เปิดการส่ง" : "พักการส่ง";
  return (
    <section aria-label="ควบคุมการส่ง LINE" className="mb-5 overflow-hidden rounded-xl border border-line bg-card">
      <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink"><Bell className="size-[18px]" aria-hidden="true" /></span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-ink-strong">การส่งแจ้งเตือน LINE</h2>
              <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${enabled && initial.available ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}><StatusIcon className="size-3.5 shrink-0" aria-hidden="true" />{status}</span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">ควบคุมการแจ้งเข้าโรงเรียน ประกาศ ผลพิจารณาคำขอ และสรุปถึงครู</p>
          </div>
        </div>
        {canManage && <div className="flex min-h-11 items-center gap-3">
          <label htmlFor={id} className="cursor-pointer text-sm font-semibold text-ink">{pending ? "กำลังบันทึก…" : "เปิดการส่ง"}</label>
          <Switch id={id} checked={enabled && initial.available} onCheckedChange={change} disabled={pending || !initial.available} />
        </div>}
      </div>
      <details className="border-t border-line bg-surface/45 px-4 sm:px-5">
        <summary className="w-fit cursor-pointer rounded-sm py-3 text-xs font-semibold text-brand-ink">ผลของการพักและเปิดการส่ง</summary>
        <div className="space-y-2 pb-4 text-sm leading-relaxed text-muted">
          <p>ขณะพักการส่ง ระบบยังบันทึกเช็คชื่อ ผู้ปกครองยังเชื่อมบัญชี แจ้งลา และดูสถานะผ่านเมนู LINE ได้ตามปกติ</p>
          <p>การเปลี่ยนสถานะมีผลกับคำขอส่งใหม่ ข้อความที่ LINE รับไปแล้วอาจยังส่งถึงผู้รับ</p>
          <p>เมื่อเปิดอีกครั้ง ระบบเริ่มแจ้งเข้าโรงเรียนจากรายการใหม่ ส่วนประกาศที่ค้างให้กดส่งต่อ{!canManage ? " · ผู้ดูแลระบบเปลี่ยนสถานะได้" : ""}</p>
        </div>
      </details>
      {(!initial.available || message) && <div className="border-t border-line px-4 py-4 sm:px-5">
        {!initial.available && <Button type="button" variant="outline" onClick={() => router.refresh()}>ตรวจสถานะอีกครั้ง</Button>}
        {message && <p role="status" className="text-sm font-medium text-ink">{message}</p>}
      </div>}
    </section>
  );
}
