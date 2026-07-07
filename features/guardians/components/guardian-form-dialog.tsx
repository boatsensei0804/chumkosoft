"use client";

import { useActionState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { saveGuardianAction } from "@/features/guardians/actions";
import { idleAction } from "@/types/form";
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
          <TextField
            name="relation"
            label="ความสัมพันธ์"
            defaultValue={guardian?.relation ?? ""}
            required
            fullWidth
            disabled={pending}
            error={Boolean(state.fieldErrors?.relation)}
            helperText={state.fieldErrors?.relation ?? "เช่น บิดา / มารดา / ผู้ปกครอง"}
          />
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
