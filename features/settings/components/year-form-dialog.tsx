"use client";

import { useActionState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { saveYearAction } from "@/features/settings/actions";
import { idleAction } from "@/types/form";
import type { AcademicYearSetting } from "@/features/settings/types";

interface YearFormDialogProps {
  open: boolean;
  year: AcademicYearSetting | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function YearFormDialog({ open, year, onClose, onSaved }: YearFormDialogProps): React.ReactNode {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: "var(--radius-lg)" } } }} aria-labelledby="year-form-title">
      {open && <Body key={year?.id ?? "new"} year={year} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  );
}

function Body({ year, onClose, onSaved }: { year: AcademicYearSetting | null; onClose: () => void; onSaved: () => void }): React.ReactNode {
  const [state, formAction, pending] = useActionState(saveYearAction, idleAction);
  const isEdit = year !== null;

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  return (
    <form action={formAction}>
      <DialogTitle id="year-form-title" sx={{ fontWeight: 700, color: "var(--ink-strong)" }}>
        {isEdit ? "แก้ไขปีการศึกษา" : "เพิ่มปีการศึกษา"}
      </DialogTitle>
      <DialogContent>
        {year && <input type="hidden" name="id" value={year.id} />}
        {state.message && !state.ok && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: "var(--radius-sm)" }}>
            {state.message}
          </Alert>
        )}
        <div className="flex flex-col gap-4 pt-1">
          <TextField
            name="buddhistYear"
            label="ปีการศึกษา (พ.ศ.)"
            type="number"
            defaultValue={year?.buddhistYear ?? ""}
            required
            fullWidth
            autoFocus
            disabled={pending}
            error={Boolean(state.fieldErrors?.buddhistYear)}
            helperText={state.fieldErrors?.buddhistYear}
            placeholder="เช่น 2568"
          />
          <TextField
            name="startDate"
            label="วันเปิดปีการศึกษา"
            type="date"
            defaultValue={year?.startDate ?? ""}
            required
            fullWidth
            disabled={pending}
            error={Boolean(state.fieldErrors?.startDate)}
            helperText={state.fieldErrors?.startDate}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            name="endDate"
            label="วันปิดปีการศึกษา"
            type="date"
            defaultValue={year?.endDate ?? ""}
            required
            fullWidth
            disabled={pending}
            error={Boolean(state.fieldErrors?.endDate)}
            helperText={state.fieldErrors?.endDate}
            slotProps={{ inputLabel: { shrink: true } }}
          />
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
