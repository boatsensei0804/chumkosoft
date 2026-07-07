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
import { saveStudentAction } from "@/features/students/actions";
import { idleAction } from "@/types/form";
import type { StudentSummary, ClassroomOption } from "@/features/dashboard/types";

interface StudentFormDialogProps {
  open: boolean;
  student: StudentSummary | null;
  classrooms: ClassroomOption[];
  onClose: () => void;
  onSaved: () => void;
}

export default function StudentFormDialog({
  open,
  student,
  classrooms,
  onClose,
  onSaved,
}: StudentFormDialogProps): React.ReactNode {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { borderRadius: "var(--radius-lg)" } } }}
      aria-labelledby="student-form-title"
    >
      {open && (
        <StudentFormBody
          key={student?.id ?? "new"}
          student={student}
          classrooms={classrooms}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </Dialog>
  );
}

function StudentFormBody({
  student,
  classrooms,
  onClose,
  onSaved,
}: {
  student: StudentSummary | null;
  classrooms: ClassroomOption[];
  onClose: () => void;
  onSaved: () => void;
}): React.ReactNode {
  const [state, formAction, pending] = useActionState(saveStudentAction, idleAction);
  const isEdit = student !== null;

  useEffect(() => {
    if (state.ok) {
      onSaved();
    }
  }, [state.ok, onSaved]);

  return (
    <form action={formAction}>
      <DialogTitle id="student-form-title" sx={{ fontWeight: 700, color: "var(--ink-strong)" }}>
        {isEdit ? "แก้ไขข้อมูลนักเรียน" : "เพิ่มนักเรียน"}
      </DialogTitle>

      <DialogContent>
        {student && <input type="hidden" name="id" value={student.id} />}

        {state.message && !state.ok && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: "var(--radius-sm)" }}>
            {state.message}
          </Alert>
        )}

        <div className="flex flex-col gap-4 pt-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_1fr]">
            <TextField
              name="prefix"
              label="คำนำหน้า"
              defaultValue={student?.prefix ?? ""}
              fullWidth
              disabled={pending}
              error={Boolean(state.fieldErrors?.prefix)}
              helperText={state.fieldErrors?.prefix}
              placeholder="ด.ช. / น.ส."
            />
            <TextField
              name="studentCode"
              label="รหัสนักเรียน"
              defaultValue={student?.code ?? ""}
              required
              fullWidth
              autoFocus
              disabled={pending}
              error={Boolean(state.fieldErrors?.studentCode)}
              helperText={state.fieldErrors?.studentCode}
              placeholder="เช่น 68-0421"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              name="firstName"
              label="ชื่อ"
              defaultValue={student?.firstName ?? ""}
              required
              fullWidth
              disabled={pending}
              error={Boolean(state.fieldErrors?.firstName)}
              helperText={state.fieldErrors?.firstName}
            />
            <TextField
              name="lastName"
              label="นามสกุล"
              defaultValue={student?.lastName ?? ""}
              required
              fullWidth
              disabled={pending}
              error={Boolean(state.fieldErrors?.lastName)}
              helperText={state.fieldErrors?.lastName}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              name="gender"
              label="เพศ"
              select
              defaultValue={student?.gender ?? ""}
              fullWidth
              disabled={pending}
              error={Boolean(state.fieldErrors?.gender)}
              helperText={state.fieldErrors?.gender}
            >
              <MenuItem value="">ไม่ระบุ</MenuItem>
              <MenuItem value="ชาย">ชาย</MenuItem>
              <MenuItem value="หญิง">หญิง</MenuItem>
            </TextField>
            <TextField
              name="birthDate"
              label="วันเกิด"
              type="date"
              defaultValue={student?.birthDate ?? ""}
              fullWidth
              disabled={pending}
              error={Boolean(state.fieldErrors?.birthDate)}
              helperText={state.fieldErrors?.birthDate}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </div>

          <TextField
            name="classroomId"
            label="ชั้นเรียน (ภาคเรียนปัจจุบัน)"
            select
            defaultValue={student?.currentClassroomId ?? ""}
            fullWidth
            disabled={pending}
            error={Boolean(state.fieldErrors?.classroomId)}
            helperText={state.fieldErrors?.classroomId ?? "เลือกเพื่อลงทะเบียนเข้าชั้นเรียนในภาคเรียนนี้"}
          >
            <MenuItem value="">ยังไม่กำหนด</MenuItem>
            {classrooms.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.code} · {c.gradeLevel}
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
          {pending ? "กำลังบันทึก…" : isEdit ? "บันทึก" : "เพิ่มนักเรียน"}
        </Button>
      </DialogActions>
    </form>
  );
}
