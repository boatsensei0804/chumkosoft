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
import { saveGuardianAction } from "@/features/guardians/actions";
import { idleAction } from "@/types/form";
import { GUARDIAN_RELATIONS, BLOOD_TYPES } from "@/features/students/constants";
import type { GuardianRow } from "@/features/guardians/types";

interface GuardianFormDialogProps {
  open: boolean;
  studentId: string;
  studentName: string;
  guardian: GuardianRow | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function GuardianFormDialog({ open, studentId, studentName, guardian, onClose, onSaved }: GuardianFormDialogProps): React.ReactNode {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: "var(--radius-lg)" } } }} aria-labelledby="guardian-form-title">
      {open && <Body key={guardian?.id ?? `new-${studentId}`} studentId={studentId} studentName={studentName} guardian={guardian} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  );
}

function Body({ studentId, studentName, guardian, onClose, onSaved }: { studentId: string; studentName: string; guardian: GuardianRow | null; onClose: () => void; onSaved: () => void }): React.ReactNode {
  const [state, formAction, pending] = useActionState(saveGuardianAction, idleAction);
  const isEdit = guardian !== null;

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  return (
    <form action={formAction}>
      <DialogTitle id="guardian-form-title" sx={{ fontWeight: 700, color: "var(--ink-strong)" }}>
        {isEdit ? "แก้ไขผู้ปกครอง" : "เพิ่มผู้ปกครอง"}
      </DialogTitle>
      <DialogContent>
        {guardian ? <input type="hidden" name="id" value={guardian.id} /> : <input type="hidden" name="studentId" value={studentId} />}
        <p className="mb-3 text-[12.5px] text-muted">นักเรียน: {studentName}</p>
        {state.message && !state.ok && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: "var(--radius-sm)" }}>
            {state.message}
          </Alert>
        )}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[110px_1fr]">
            <TextField name="prefix" label="คำนำหน้า" defaultValue={guardian?.prefix ?? ""} fullWidth disabled={pending} error={Boolean(state.fieldErrors?.prefix)} helperText={state.fieldErrors?.prefix} placeholder="นาย / นาง" />
            <TextField
              name="fullName"
              label="ชื่อ-นามสกุลผู้ปกครอง"
              defaultValue={guardian?.fullName ?? ""}
              required
              fullWidth
              autoFocus
              disabled={pending}
              error={Boolean(state.fieldErrors?.fullName)}
              helperText={state.fieldErrors?.fullName}
            />
          </div>
          <TextField
            name="relation"
            label="ความสัมพันธ์"
            select
            defaultValue={guardian?.relation ?? ""}
            required
            fullWidth
            disabled={pending}
            error={Boolean(state.fieldErrors?.relation)}
            helperText={state.fieldErrors?.relation}
          >
            {GUARDIAN_RELATIONS.map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField name="nationalId" label="เลขบัตรประชาชน" defaultValue={guardian?.nationalId ?? ""} fullWidth disabled={pending} error={Boolean(state.fieldErrors?.nationalId)} helperText={state.fieldErrors?.nationalId} placeholder="13 หลัก" slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 17 } }} />
            <TextField name="bloodType" label="กรุ๊ปเลือด" select defaultValue={guardian?.bloodType ?? ""} fullWidth disabled={pending} error={Boolean(state.fieldErrors?.bloodType)} helperText={state.fieldErrors?.bloodType}>
              <MenuItem value="">ไม่ระบุ</MenuItem>
              {BLOOD_TYPES.map((b) => (
                <MenuItem key={b} value={b}>
                  {b}
                </MenuItem>
              ))}
            </TextField>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField name="occupation" label="อาชีพ" defaultValue={guardian?.occupation ?? ""} fullWidth disabled={pending} error={Boolean(state.fieldErrors?.occupation)} helperText={state.fieldErrors?.occupation} />
            <TextField name="monthlyIncome" label="รายได้ต่อเดือน (บาท)" defaultValue={guardian?.monthlyIncome ?? ""} fullWidth disabled={pending} error={Boolean(state.fieldErrors?.monthlyIncome)} helperText={state.fieldErrors?.monthlyIncome} slotProps={{ htmlInput: { inputMode: "numeric" } }} />
          </div>
          <TextField
            name="phone"
            label="เบอร์โทร"
            defaultValue={guardian?.phone ?? ""}
            fullWidth
            disabled={pending}
            error={Boolean(state.fieldErrors?.phone)}
            helperText={state.fieldErrors?.phone}
          />
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={pending} variant="text">
          ยกเลิก
        </Button>
        <Button type="submit" disabled={pending} variant="contained">
          {pending ? "กำลังบันทึก…" : isEdit ? "บันทึก" : "เพิ่มผู้ปกครอง"}
        </Button>
      </DialogActions>
    </form>
  );
}
