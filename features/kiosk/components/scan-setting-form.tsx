"use client";

import { useState, useTransition } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveScanSettingAction } from "@/features/kiosk/actions";
import { idleAction } from "@/types/form";
import type { ScanSettingView } from "@/features/kiosk/types";

export default function ScanSettingForm({ setting }: { setting: ScanSettingView }): React.ReactNode {
  const [scanStartTime, setScanStartTime] = useState(setting.scanStartTime);
  const [lateAfterTime, setLateAfterTime] = useState(setting.lateAfterTime);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function submit(): void {
    setResult(null);
    setFieldErrors({});
    const fd = new FormData();
    fd.set("scanStartTime", scanStartTime);
    fd.set("lateAfterTime", lateAfterTime);
    startTransition(async () => {
      const res = await saveScanSettingAction(idleAction, fd);
      setFieldErrors(res.fieldErrors ?? {});
      if (res.message) setResult({ ok: res.ok, message: res.message });
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-[10px] bg-brand-soft text-brand-ink">
          <Clock className="size-[19px]" />
        </span>
        <div>
          <h2 className="text-[15px] font-bold text-ink-strong">เวลาการสแกนเข้าโรงเรียน</h2>
          <p className="text-[12.5px] text-muted">จุดสแกนจะเริ่มเช็คชื่อตามเวลาที่เปิด และนับว่า “สาย” เมื่อเลยเวลาที่กำหนด</p>
        </div>
      </div>

      {result && (
        <p
          className={
            result.ok
              ? "mb-3 rounded-md border border-success/30 bg-success-soft px-3 py-2 text-sm"
              : "mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
          style={result.ok ? { color: "oklch(0.42 0.1 152)" } : undefined}
        >
          {result.message}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="scanStartTime">เวลาเปิดสแกน</Label>
          <Input id="scanStartTime" type="time" value={scanStartTime} onChange={(e) => setScanStartTime(e.target.value)} disabled={pending} className="w-40" aria-invalid={Boolean(fieldErrors.scanStartTime)} />
          {fieldErrors.scanStartTime && <p className="text-xs text-destructive">{fieldErrors.scanStartTime}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lateAfterTime">หลังเวลานี้ = สาย</Label>
          <Input id="lateAfterTime" type="time" value={lateAfterTime} onChange={(e) => setLateAfterTime(e.target.value)} disabled={pending} className="w-40" aria-invalid={Boolean(fieldErrors.lateAfterTime)} />
          {fieldErrors.lateAfterTime && <p className="text-xs text-destructive">{fieldErrors.lateAfterTime}</p>}
        </div>
        <Button onClick={submit} disabled={pending}>
          {pending ? "กำลังบันทึก…" : "บันทึกเวลา"}
        </Button>
      </div>
    </section>
  );
}
