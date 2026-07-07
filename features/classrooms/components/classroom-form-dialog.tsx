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
import { saveClassroomAction } from "@/features/classrooms/actions";
import { idleAction } from "@/types/form";
import type { ClassroomRow, TeacherOption } from "@/features/classrooms/types";

interface ClassroomFormDialogProps {
  open: boolean;
  classroom: ClassroomRow | null;
  teachers: TeacherOption[];
  onClose: () => void;
  onSaved: () => void;
}

export default function ClassroomFormDialog({ open, classroom, teachers, onClose, onSaved }: ClassroomFormDialogProps): React.ReactNode {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: "var(--radius-lg)" } } }} aria-labelledby="classroom-form-title">
      {open && <Body key={classroom?.id ?? "new"} classroom={classroom} teachers={teachers} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  );
}

function Body({
  classroom,
  teachers,
  onClose,
  onSaved,
}: {
  classroom: ClassroomRow | null;
  teachers: TeacherOption[];
  onClose: () => void;
  onSaved: () => void;
}): React.ReactNode {
  const [state, formAction, pending] = useActionState(saveClassroomAction, idleAction);
  const isEdit = classroom !== null;

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  return (
    <form action={formAction}>
      <DialogTitle id="classroom-form-title" sx={{ fontWeight: 700, color: "var(--ink-strong)" }}>
        {isEdit ? "แก้ไขห้องเรียน" : "เพิ่มห้องเรียน"}
      </DialogTitle>
      <DialogContent>
        {classroom && <input type="hidden" name="id" value={classroom.id} />}
        {state.message && !state.ok && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: "var(--radius-sm)" }}>
            {state.message}
          </Alert>
        )}
        <div className="flex flex-col gap-4 pt-1">
          <TextField
            name="code"
            label="ชื่อห้อง"
            defaultValue={classroom?.code ?? ""}
            required
            fullWidth
            autoFocus
            disabled={pending}
            error={Boolean(state.fieldErrors?.code)}
            helperText={state.fieldErrors?.code}
            placeholder="เช่น ม.4/1"
          />
          <TextField
            name="gradeLevel"
            label="ระดับชั้น"
            defaultValue={classroom?.gradeLevel ?? ""}
            required
            fullWidth
            disabled={pending}
            error={Boolean(state.fieldErrors?.gradeLevel)}
            helperText={state.fieldErrors?.gradeLevel}
            placeholder="เช่น มัธยมปลาย"
          />
          <TextField
            name="homeroomTeacherId"
            label="ครูที่ปรึกษา"
            select
            defaultValue={classroom?.homeroomTeacherId ?? ""}
            fullWidth
            disabled={pending}
            error={Boolean(state.fieldErrors?.homeroomTeacherId)}
            helperText={state.fieldErrors?.homeroomTeacherId ?? "เลือกครูประจำชั้น (เว้นว่างได้)"}
          >
            <MenuItem value="">ยังไม่กำหนด</MenuItem>
            {teachers.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
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
          {pending ? "กำลังบันทึก…" : isEdit ? "บันทึก" : "เพิ่มห้องเรียน"}
        </Button>
      </DialogActions>
    </form>
  );
}
