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
    <section className="rounded-xl border border-line bg-card p-4">
      <h2 className="mb-4 flex items-center gap-2 font-bold text-ink-strong">
        <Clock className="size-[18px] shrink-0 text-brand" aria-hidden="true" /> เวลาเช็คชื่อเข้าโรงเรียน
      </h2>

      {result && (
        <p
          role={result.ok ? "status" : "alert"}
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

      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="scanStartTime">เวลาเปิดสแกน</Label>
          <Input id="scanStartTime" type="time" value={scanStartTime} onChange={(e) => setScanStartTime(e.target.value)} disabled={pending} className="px-2 tabular-nums" aria-invalid={Boolean(fieldErrors.scanStartTime)} />
          {fieldErrors.scanStartTime && <p className="text-xs text-destructive">{fieldErrors.scanStartTime}</p>}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="lateAfterTime">สายหลังเวลา</Label>
          <Input id="lateAfterTime" type="time" value={lateAfterTime} onChange={(e) => setLateAfterTime(e.target.value)} disabled={pending} className="px-2 tabular-nums" aria-invalid={Boolean(fieldErrors.lateAfterTime)} />
          {fieldErrors.lateAfterTime && <p className="text-xs text-destructive">{fieldErrors.lateAfterTime}</p>}
        </div>
        <Button type="button" onClick={submit} disabled={pending} variant="outline" className="col-span-2 justify-self-start">
          {pending ? "กำลังบันทึก…" : "บันทึกเวลา"}
        </Button>
      </div>
    </section>
  );
}
