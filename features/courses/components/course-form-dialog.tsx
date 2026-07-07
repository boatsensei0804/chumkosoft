"use client";

import { useActionState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { saveCourseAction } from "@/features/courses/actions";
import { idleAction } from "@/types/form";
import type { CourseSummary } from "@/features/courses/types";

interface CourseFormDialogProps {
  open: boolean;
  course: CourseSummary | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function CourseFormDialog({ open, course, onClose, onSaved }: CourseFormDialogProps): React.ReactNode {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { borderRadius: "var(--radius-lg)" } } }}
      aria-labelledby="course-form-title"
    >
      {open && <CourseFormBody key={course?.id ?? "new"} course={course} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  );
}

function CourseFormBody({
  course,
  onClose,
  onSaved,
}: {
  course: CourseSummary | null;
  onClose: () => void;
  onSaved: () => void;
}): React.ReactNode {
  const [state, formAction, pending] = useActionState(saveCourseAction, idleAction);
  const isEdit = course !== null;

  useEffect(() => {
    if (state.ok) {
      onSaved();
    }
  }, [state.ok, onSaved]);

  return (
    <form action={formAction}>
      <DialogTitle id="course-form-title" sx={{ fontWeight: 700, color: "var(--ink-strong)" }}>
        {isEdit ? "แก้ไขรายวิชา" : "เพิ่มรายวิชา"}
      </DialogTitle>

      <DialogContent>
        {course && <input type="hidden" name="id" value={course.id} />}

        {state.message && !state.ok && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: "var(--radius-sm)" }}>
            {state.message}
          </Alert>
        )}

        <div className="flex flex-col gap-4 pt-1">
          <TextField
            name="code"
            label="รหัสวิชา"
            defaultValue={course?.code ?? ""}
            required
            fullWidth
            autoFocus
            disabled={pending}
            error={Boolean(state.fieldErrors?.code)}
            helperText={state.fieldErrors?.code}
            placeholder="เช่น ค30201"
          />
          <TextField
            name="name"
            label="ชื่อรายวิชา"
            defaultValue={course?.name ?? ""}
            required
            fullWidth
            disabled={pending}
            error={Boolean(state.fieldErrors?.name)}
            helperText={state.fieldErrors?.name}
            placeholder="เช่น คณิตศาสตร์เพิ่มเติม"
          />
          <TextField
            name="credits"
            label="หน่วยกิต"
            type="number"
            defaultValue={course?.credits ?? ""}
            fullWidth
            disabled={pending}
            error={Boolean(state.fieldErrors?.credits)}
            helperText={state.fieldErrors?.credits ?? "เว้นว่างได้หากไม่มีหน่วยกิต"}
            slotProps={{ htmlInput: { step: 0.5, min: 0, max: 20 } }}
          />
          <TextField
            name="description"
            label="คำอธิบายรายวิชา"
            defaultValue={course?.description ?? ""}
            fullWidth
            multiline
            minRows={2}
            disabled={pending}
            error={Boolean(state.fieldErrors?.description)}
            helperText={state.fieldErrors?.description}
          />
        </div>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={pending} variant="text">
          ยกเลิก
        </Button>
        <Button type="submit" disabled={pending} variant="contained">
          {pending ? "กำลังบันทึก…" : isEdit ? "บันทึก" : "เพิ่มรายวิชา"}
        </Button>
      </DialogActions>
    </form>
  );
}
