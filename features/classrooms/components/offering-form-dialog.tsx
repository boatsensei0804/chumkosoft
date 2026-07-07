"use client";

import { useActionState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { addOfferingAction } from "@/features/classrooms/offering-actions";
import { idleAction } from "@/types/form";
import type { OfferingOptions } from "@/features/classrooms/types";

interface OfferingFormDialogProps {
  open: boolean;
  classroomId: string;
  options: OfferingOptions;
  /** When set, the offering is created under this term (the timetable's viewed term). */
  termId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function OfferingFormDialog({ open, classroomId, termId, options, onClose, onSaved }: OfferingFormDialogProps): React.ReactNode {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: "var(--radius-lg)" } } }} aria-labelledby="offering-form-title">
      {open && <Body key={`${classroomId}:${termId ?? ""}`} classroomId={classroomId} termId={termId} options={options} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  );
}

function Body({ classroomId, termId, options, onClose, onSaved }: { classroomId: string; termId?: string; options: OfferingOptions; onClose: () => void; onSaved: () => void }): React.ReactNode {
  const [state, formAction, pending] = useActionState(addOfferingAction, idleAction);

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  return (
    <form action={formAction}>
      <DialogTitle id="offering-form-title" sx={{ fontWeight: 700, color: "var(--ink-strong)" }}>
        เพิ่มรายวิชาให้ห้องเรียน
      </DialogTitle>
      <DialogContent>
        <input type="hidden" name="classroomId" value={classroomId} />
        {termId && <input type="hidden" name="termId" value={termId} />}
        {state.message && !state.ok && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: "var(--radius-sm)" }}>
            {state.message}
          </Alert>
        )}
        <div className="flex flex-col gap-4 pt-1">
          <TextField name="courseId" label="รายวิชา" select defaultValue="" required fullWidth disabled={pending} error={Boolean(state.fieldErrors?.courseId)} helperText={state.fieldErrors?.courseId}>
            <MenuItem value="">เลือกรายวิชา…</MenuItem>
            {options.courses.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField name="teacherId" label="ผู้สอน" select defaultValue="" required fullWidth disabled={pending} error={Boolean(state.fieldErrors?.teacherId)} helperText={state.fieldErrors?.teacherId}>
            <MenuItem value="">เลือกผู้สอน…</MenuItem>
            {options.teachers.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField name="roomId" label="ห้องเรียน/ห้องปฏิบัติการ" select defaultValue="" required fullWidth disabled={pending} error={Boolean(state.fieldErrors?.roomId)} helperText={state.fieldErrors?.roomId}>
            <MenuItem value="">เลือกห้อง…</MenuItem>
            {options.rooms.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            name="periodsPerWeek"
            label="จำนวนคาบต่อสัปดาห์"
            type="number"
            defaultValue={1}
            required
            fullWidth
            disabled={pending}
            error={Boolean(state.fieldErrors?.periodsPerWeek)}
            helperText={state.fieldErrors?.periodsPerWeek}
            slotProps={{ htmlInput: { min: 1, max: 20 } }}
          />
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={pending} variant="text">
          ยกเลิก
        </Button>
        <Button type="submit" disabled={pending} variant="contained">
          {pending ? "กำลังบันทึก…" : "เพิ่มรายวิชา"}
        </Button>
      </DialogActions>
    </form>
  );
}
