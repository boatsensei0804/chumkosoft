"use client";

import { useActionState, useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Checkbox from "@mui/material/Checkbox";
import ListItemText from "@mui/material/ListItemText";
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
  const [advisorIds, setAdvisorIds] = useState<string[]>(classroom?.advisors.map((a) => a.id) ?? []);

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
            label="ครูที่ปรึกษา (เลือกได้หลายคน)"
            select
            value={advisorIds}
            onChange={(e) => {
              const v = e.target.value;
              setAdvisorIds(typeof v === "string" ? v.split(",") : (v as unknown as string[]));
            }}
            fullWidth
            disabled={pending}
            error={Boolean(state.fieldErrors?.advisorIds)}
            helperText={state.fieldErrors?.advisorIds ?? "เลือกครูประจำชั้น เลือกได้มากกว่า 1 คน (เว้นว่างได้)"}
            slotProps={{
              inputLabel: { shrink: true },
              select: {
                multiple: true,
                displayEmpty: true,
                renderValue: (selected) => {
                  const ids = selected as string[];
                  if (ids.length === 0) return <span style={{ color: "var(--faint)" }}>ยังไม่กำหนด</span>;
                  return teachers.filter((t) => ids.includes(t.id)).map((t) => t.name).join(", ");
                },
              },
            }}
          >
            {teachers.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                <Checkbox checked={advisorIds.includes(t.id)} size="small" sx={{ py: 0.25 }} />
                <ListItemText primary={t.name} />
              </MenuItem>
            ))}
          </TextField>
          {advisorIds.map((id) => (
            <input key={id} type="hidden" name="advisorIds" value={id} />
          ))}
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
