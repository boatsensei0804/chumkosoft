"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Icon from "@/features/dashboard/components/icon";
import { LabeledInput, Switch } from "./controls";
import { savePeriodsAction } from "@/features/settings/actions";
import type { PeriodSetting } from "../types";

export default function PeriodSettings({ initialPeriods }: { initialPeriods: PeriodSetting[] }): React.ReactNode {
  const router = useRouter();
  const [periods, setPeriods] = useState<PeriodSetting[]>(() => initialPeriods.map((p) => ({ ...p })));
  const [isSaving, startSave] = useTransition();
  const [toast, setToast] = useState<{ severity: "success" | "error"; message: string } | null>(null);

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
      setToast({ severity: result.ok ? "success" : "error", message: result.message ?? (result.ok ? "บันทึกแล้ว" : "บันทึกไม่สำเร็จ") });
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-lg text-[13.5px] text-muted">
          กำหนดจำนวนคาบและช่วงเวลาของแต่ละคาบ ค่าเหล่านี้ใช้เป็นโครงเวลาในหน้าจัดตารางสอนและการเช็คชื่อ
        </p>
        <div className="flex items-center gap-2">
          <span className="tabular inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold" style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand-ink)" }}>
            <Icon name="time" sx={{ fontSize: 16 }} />
            {classCount} คาบเรียน
          </span>
          <Button variant="contained" onClick={save} disabled={isSaving}>
            {isSaving ? "กำลังบันทึก…" : "บันทึก"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_288px] lg:items-start">
        <div className="flex flex-col gap-2 rounded-[16px] p-3" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
          {periods.map((p, i) => (
            <div key={p.id} className="flex flex-wrap items-end gap-3 rounded-[12px] p-3" style={{ backgroundColor: p.isBreak ? "var(--surface-sunken)" : "var(--surface)", border: "1px solid var(--line)" }}>
              <div className="flex flex-col items-center gap-0.5 pb-1">
                <IconButton size="small" onClick={() => move(p.id, -1)} disabled={i === 0} aria-label="เลื่อนขึ้น" sx={{ padding: "1px" }}>
                  <Icon name="chevron_down" sx={{ fontSize: 18, transform: "rotate(180deg)" }} />
                </IconButton>
                <IconButton size="small" onClick={() => move(p.id, 1)} disabled={i === periods.length - 1} aria-label="เลื่อนลง" sx={{ padding: "1px" }}>
                  <Icon name="chevron_down" sx={{ fontSize: 18 }} />
                </IconButton>
              </div>
              <LabeledInput label="ชื่อคาบ" value={p.label} onChange={(v) => patch(p.id, { label: v })} className="min-w-[130px] flex-1" />
              <LabeledInput label="เริ่ม" type="time" value={p.startTime} onChange={(v) => patch(p.id, { startTime: v })} className="w-[120px]" />
              <LabeledInput label="สิ้นสุด" type="time" value={p.endTime} onChange={(v) => patch(p.id, { endTime: v })} className="w-[120px]" />
              <div className="flex items-center gap-2 pb-1.5">
                <Switch checked={p.isBreak} onChange={(v) => patch(p.id, { isBreak: v })} label={`ตั้ง ${p.label} เป็นคาบพัก`} />
                <span className="text-[12.5px] font-medium text-muted">พัก</span>
              </div>
              <Tooltip title="ลบคาบ" arrow>
                <IconButton size="small" onClick={() => remove(p.id)} aria-label={`ลบ ${p.label}`} sx={{ marginBottom: "2px" }}>
                  <Icon name="close" sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </div>
          ))}

          <div className="mt-1 flex gap-2">
            <button type="button" onClick={() => addPeriod(false)} className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] py-2.5 text-[13px] font-semibold transition-colors hover:bg-surface-2" style={{ border: "1px dashed var(--line-strong)", color: "var(--brand-ink)" }}>
              <Icon name="add" sx={{ fontSize: 17 }} />
              เพิ่มคาบเรียน
            </button>
            <button type="button" onClick={() => addPeriod(true)} className="flex items-center justify-center gap-1.5 rounded-[10px] px-4 py-2.5 text-[13px] font-semibold transition-colors hover:bg-surface-2" style={{ border: "1px dashed var(--line-strong)", color: "var(--muted)" }}>
              <Icon name="add" sx={{ fontSize: 17 }} />
              เพิ่มคาบพัก
            </button>
          </div>
        </div>

        <div className="rounded-[16px] p-4 lg:sticky lg:top-24" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
          <h3 className="text-[13.5px] font-bold text-ink-strong">ตัวอย่างช่วงเวลาในหนึ่งวัน</h3>
          <p className="mb-3 text-[12px] text-muted">อัปเดตตามการตั้งค่า</p>
          <ol className="flex flex-col gap-1.5">
            {periods.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 rounded-[10px] px-3 py-2" style={{ backgroundColor: p.isBreak ? "var(--surface-sunken)" : "var(--brand-softer)" }}>
                <span className="tabular grid size-6 shrink-0 place-items-center rounded-md text-[11px] font-bold" style={{ backgroundColor: p.isBreak ? "var(--surface)" : "var(--brand-soft)", color: p.isBreak ? "var(--faint)" : "var(--brand-ink)" }}>
                  {p.isBreak ? "—" : periods.slice(0, i + 1).filter((x) => !x.isBreak).length}
                </span>
                <span className="flex-1 truncate text-[12.5px] font-medium text-ink">{p.label}</span>
                <span className="tabular text-[12px] text-muted">{p.startTime || "--:--"}–{p.endTime || "--:--"}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <Snackbar open={toast !== null} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: "var(--radius-sm)" }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </div>
  );
}
