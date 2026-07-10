"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock, ChevronUp, ChevronDown, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { LabeledInput, Switch } from "./controls";
import { savePeriodsAction } from "@/features/settings/actions";
import type { PeriodSetting } from "../types";

export default function PeriodSettings({ initialPeriods }: { initialPeriods: PeriodSetting[] }): React.ReactNode {
  const router = useRouter();
  const [periods, setPeriods] = useState<PeriodSetting[]>(() => initialPeriods.map((p) => ({ ...p })));
  const [isSaving, startSave] = useTransition();

  const classCount = periods.filter((p) => !p.isBreak).length;

  function patch(id: string, p: Partial<PeriodSetting>): void {
    setPeriods((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));
  }

  function remove(id: string): void {
    setPeriods((prev) => prev.filter((x) => x.id !== id));
  }

  function move(id: string, dir: -1 | 1): void {
    setPeriods((prev) => {
      const i = prev.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function addPeriod(isBreak: boolean): void {
    const last = periods[periods.length - 1];
    const classNo = periods.filter((p) => !p.isBreak).length + 1;
    setPeriods((prev) => [
      ...prev,
      { id: `tmp:${crypto.randomUUID()}`, label: isBreak ? "พัก" : `คาบ ${classNo}`, startTime: last?.endTime ?? "08:30", endTime: "", isBreak },
    ]);
  }

  function save(): void {
    startSave(async () => {
      const payload = periods.map((p) => ({
        id: p.id.startsWith("tmp:") ? undefined : p.id,
        label: p.label,
        startTime: p.startTime,
        endTime: p.endTime,
        isBreak: p.isBreak,
      }));
      const result = await savePeriodsAction(payload);
      if (result.ok) {
        toast.success(result.message ?? "บันทึกแล้ว");
        router.refresh();
      } else {
        toast.error(result.message ?? "บันทึกไม่สำเร็จ");
      }
    });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-lg text-[13.5px] text-muted">
            กำหนดจำนวนคาบและช่วงเวลาของแต่ละคาบ ค่าเหล่านี้ใช้เป็นโครงเวลาในหน้าจัดตารางสอนและการเช็คชื่อ
          </p>
          <div className="flex items-center gap-2">
            <span className="tabular inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-[13px] font-semibold text-brand-ink">
              <Clock className="size-4" />
              {classCount} คาบเรียน
            </span>
            <Button onClick={save} disabled={isSaving}>
              {isSaving ? "กำลังบันทึก…" : "บันทึก"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_288px] lg:items-start">
          <div className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-3 shadow-sm">
            {periods.map((p, i) => (
              <div key={p.id} className={cn("flex flex-wrap items-end gap-3 rounded-[12px] border border-line p-3", p.isBreak ? "bg-surface-sunken" : "bg-surface")}>
                <div className="flex flex-col items-center gap-0.5 pb-1">
                  <Button variant="ghost" size="icon" className="size-6" onClick={() => move(p.id, -1)} disabled={i === 0} aria-label="เลื่อนขึ้น">
                    <ChevronUp className="size-[18px]" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-6" onClick={() => move(p.id, 1)} disabled={i === periods.length - 1} aria-label="เลื่อนลง">
                    <ChevronDown className="size-[18px]" />
                  </Button>
                </div>
                <LabeledInput label="ชื่อคาบ" value={p.label} onChange={(v) => patch(p.id, { label: v })} className="min-w-[130px] flex-1" />
                <LabeledInput label="เริ่ม" type="time" value={p.startTime} onChange={(v) => patch(p.id, { startTime: v })} className="w-[120px]" />
                <LabeledInput label="สิ้นสุด" type="time" value={p.endTime} onChange={(v) => patch(p.id, { endTime: v })} className="w-[120px]" />
                <div className="flex items-center gap-2 pb-1.5">
                  <Switch checked={p.isBreak} onChange={(v) => patch(p.id, { isBreak: v })} label={`ตั้ง ${p.label} เป็นคาบพัก`} />
                  <span className="text-[12.5px] font-medium text-muted">พัก</span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="mb-0.5 size-8 text-muted hover:text-ink" onClick={() => remove(p.id)} aria-label={`ลบ ${p.label}`}>
                      <X className="size-[18px]" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>ลบคาบ</TooltipContent>
                </Tooltip>
              </div>
            ))}

            <div className="mt-1 flex gap-2">
              <button type="button" onClick={() => addPeriod(false)} className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-line-strong py-2.5 text-[13px] font-semibold text-brand-ink transition-colors hover:bg-surface-2">
                <Plus className="size-[17px]" />
                เพิ่มคาบเรียน
              </button>
              <button type="button" onClick={() => addPeriod(true)} className="flex items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-line-strong px-4 py-2.5 text-[13px] font-semibold text-muted transition-colors hover:bg-surface-2">
                <Plus className="size-[17px]" />
                เพิ่มคาบพัก
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-card p-4 shadow-sm lg:sticky lg:top-24">
            <h3 className="text-[13.5px] font-bold text-ink-strong">ตัวอย่างช่วงเวลาในหนึ่งวัน</h3>
            <p className="mb-3 text-[12px] text-muted">อัปเดตตามการตั้งค่า</p>
            <ol className="flex flex-col gap-1.5">
              {periods.map((p, i) => (
                <li key={p.id} className={cn("flex items-center gap-3 rounded-[10px] px-3 py-2", p.isBreak ? "bg-surface-sunken" : "bg-brand-softer")}>
                  <span className={cn("tabular grid size-6 shrink-0 place-items-center rounded-md text-[11px] font-bold", p.isBreak ? "bg-surface text-faint" : "bg-brand-soft text-brand-ink")}>
                    {p.isBreak ? "—" : periods.slice(0, i + 1).filter((x) => !x.isBreak).length}
                  </span>
                  <span className="flex-1 truncate text-[12.5px] font-medium text-ink">{p.label}</span>
                  <span className="tabular text-[12px] text-muted">
                    {p.startTime || "--:--"}–{p.endTime || "--:--"}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
