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
import { saveTermAction } from "@/features/settings/actions";
import { idleAction } from "@/types/form";
import type { TermSetting } from "@/features/settings/types";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "UPCOMING", label: "รอเปิดเทอม" },
  { value: "ACTIVE", label: "กำลังเรียน" },
  { value: "CLOSED", label: "ปิดแล้ว" },
];

interface TermFormDialogProps {
  open: boolean;
  academicYearId: string;
  term: TermSetting | null;
  suggestedNumber: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function TermFormDialog({
  open,
  academicYearId,
  term,
  suggestedNumber,
  onClose,
  onSaved,
}: TermFormDialogProps): React.ReactNode {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: "var(--radius-lg)" } } }} aria-labelledby="term-form-title">
      {open && (
        <Body
          key={term?.id ?? "new"}
          academicYearId={academicYearId}
          term={term}
          suggestedNumber={suggestedNumber}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </Dialog>
  );
}

function Body({
  academicYearId,
  term,
  suggestedNumber,
  onClose,
  onSaved,
}: {
  academicYearId: string;
  term: TermSetting | null;
  suggestedNumber: number;
  onClose: () => void;
  onSaved: () => void;
}): React.ReactNode {
  const [state, formAction, pending] = useActionState(saveTermAction, idleAction);
  const isEdit = term !== null;

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  return (
    <form action={formAction}>
      <DialogTitle id="term-form-title" sx={{ fontWeight: 700, color: "var(--ink-strong)" }}>
        {isEdit ? "แก้ไขภาคเรียน" : "เพิ่มภาคเรียน"}
      </DialogTitle>
      <DialogContent>
        <input type="hidden" name="academicYearId" value={academicYearId} />
        {term && <input type="hidden" name="id" value={term.id} />}
        {state.message && !state.ok && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: "var(--radius-sm)" }}>
            {state.message}
          </Alert>
        )}
        <div className="flex flex-col gap-4 pt-1">
          <div className="grid grid-cols-[110px_1fr] gap-4">
            <TextField
              name="number"
              label="ภาคเรียนที่"
              type="number"
              defaultValue={term?.number ?? suggestedNumber}
              required
              disabled={pending}
              error={Boolean(state.fieldErrors?.number)}
              helperText={state.fieldErrors?.number}
              slotProps={{ htmlInput: { min: 1, max: 6 } }}
            />
            <TextField
              name="name"
              label="ชื่อภาคเรียน"
              defaultValue={term?.name ?? ""}
              required
              fullWidth
              autoFocus
              disabled={pending}
              error={Boolean(state.fieldErrors?.name)}
              helperText={state.fieldErrors?.name}
              placeholder="เช่น ภาคเรียนที่ 1"
            />
          </div>
          <TextField
            name="startDate"
            label="วันเปิดภาคเรียน"
            type="date"
            defaultValue={term?.startDate ?? ""}
            required
            fullWidth
            disabled={pending}
            error={Boolean(state.fieldErrors?.startDate)}
            helperText={state.fieldErrors?.startDate}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            name="endDate"
            label="วันปิดภาคเรียน"
            type="date"
            defaultValue={term?.endDate ?? ""}
            required
            fullWidth
            disabled={pending}
            error={Boolean(state.fieldErrors?.endDate)}
            helperText={state.fieldErrors?.endDate}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            name="status"
            label="สถานะ"
            select
            defaultValue={term?.status ?? "UPCOMING"}
            required
            fullWidth
            disabled={pending}
          >
            {STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={pending} variant="text">
          ยกเลิก
        </Button>
        <Button type="submit" disabled={pending} variant="contained">
          {pending ? "กำลังบันทึก…" : isEdit ? "บันทึก" : "เพิ่ม"}
        </Button>
      </DialogActions>
    </form>
  );
}
