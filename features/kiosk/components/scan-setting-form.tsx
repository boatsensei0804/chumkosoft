"use client";

import { useActionState } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Icon from "@/features/dashboard/components/icon";
import { saveScanSettingAction } from "@/features/kiosk/actions";
import { idleAction } from "@/types/form";
import type { ScanSettingView } from "@/features/kiosk/types";

export default function ScanSettingForm({ setting }: { setting: ScanSettingView }): React.ReactNode {
  const [state, formAction, pending] = useActionState(saveScanSettingAction, idleAction);

  return (
    <section className="rounded-[16px] p-5" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-[10px]" style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand-ink)" }}>
          <Icon name="time" sx={{ fontSize: 19 }} />
        </span>
        <div>
          <h2 className="text-[15px] font-bold text-ink-strong">เวลาการสแกนเข้าโรงเรียน</h2>
          <p className="text-[12.5px] text-muted">จุดสแกนจะเริ่มเช็คชื่อตามเวลาที่เปิด และนับว่า “สาย” เมื่อเลยเวลาที่กำหนด</p>
        </div>
      </div>

      {state.message && (
        <Alert severity={state.ok ? "success" : "error"} sx={{ mb: 2, borderRadius: "var(--radius-sm)" }}>
          {state.message}
        </Alert>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-4">
        <TextField
          name="scanStartTime"
          label="เวลาเปิดสแกน"
          type="time"
          defaultValue={setting.scanStartTime}
          disabled={pending}
          error={Boolean(state.fieldErrors?.scanStartTime)}
          helperText={state.fieldErrors?.scanStartTime}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 160 }}
        />
        <TextField
          name="lateAfterTime"
          label="หลังเวลานี้ = สาย"
          type="time"
          defaultValue={setting.lateAfterTime}
          disabled={pending}
          error={Boolean(state.fieldErrors?.lateAfterTime)}
          helperText={state.fieldErrors?.lateAfterTime}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 160 }}
        />
        <Button type="submit" variant="contained" disabled={pending}>
          {pending ? "กำลังบันทึก…" : "บันทึกเวลา"}
        </Button>
      </form>
    </section>
  );
}
