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
import { saveStaffAction } from "@/features/teachers/actions";
import { idleAction } from "@/types/form";
import type { StaffSummary } from "@/features/teachers/types";

const KIND_OPTIONS: { value: string; label: string }[] = [
  { value: "TEACHER", label: "ครูผู้สอน" },
  { value: "PERSONNEL", label: "บุคลากร" },
  { value: "ADMIN", label: "ผู้ดูแลระบบ" },
];

interface StaffFormDialogProps {
  open: boolean;
  staff: StaffSummary | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function StaffFormDialog({ open, staff, onClose, onSaved }: StaffFormDialogProps): React.ReactNode {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      slotProps={{ paper: { sx: { borderRadius: "var(--radius-lg)" } } }}
      aria-labelledby="staff-form-title"
    >
      {open && <StaffFormBody key={staff?.id ?? "new"} staff={staff} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }): React.ReactNode {
  return (
    <p className="mt-1 pt-3 text-[12px] font-semibold uppercase tracking-wider text-faint" style={{ borderTop: "1px solid var(--line)" }}>
      {children}
    </p>
  );
}

function StaffFormBody({
  staff,
  onClose,
  onSaved,
}: {
  staff: StaffSummary | null;
  onClose: () => void;
  onSaved: () => void;
}): React.ReactNode {
  const [state, formAction, pending] = useActionState(saveStaffAction, idleAction);
  const isEdit = staff !== null;
  const err = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) {
      onSaved();
    }
  }, [state.ok, onSaved]);

  const dateProps = { type: "date", slotProps: { inputLabel: { shrink: true } } } as const;

  return (
    <form action={formAction}>
      <DialogTitle id="staff-form-title" sx={{ fontWeight: 700, color: "var(--ink-strong)" }}>
        {isEdit ? "แก้ไขข้อมูลบุคลากร" : "เพิ่มบุคลากร"}
      </DialogTitle>

      <DialogContent>
        {staff && <input type="hidden" name="id" value={staff.id} />}

        {state.message && !state.ok && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: "var(--radius-sm)" }}>
            {state.message}
          </Alert>
        )}

        <div className="flex flex-col gap-4 pt-1">
          {/* ── ข้อมูลทั่วไป ─────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_1fr]">
            <TextField name="prefix" label="คำนำหน้า" defaultValue={staff?.prefix ?? ""} fullWidth disabled={pending} error={Boolean(err.prefix)} helperText={err.prefix} placeholder="อ." />
            <TextField name="staffCode" label="รหัสบุคลากร" defaultValue={staff?.code ?? ""} required fullWidth autoFocus disabled={pending} error={Boolean(err.staffCode)} helperText={err.staffCode} placeholder="เช่น T-001" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField name="firstName" label="ชื่อ" defaultValue={staff?.firstName ?? ""} required fullWidth disabled={pending} error={Boolean(err.firstName)} helperText={err.firstName} />
            <TextField name="lastName" label="นามสกุล" defaultValue={staff?.lastName ?? ""} required fullWidth disabled={pending} error={Boolean(err.lastName)} helperText={err.lastName} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField name="type" label="ประเภทบุคลากร" select defaultValue={staff?.type ?? "TEACHER"} required fullWidth disabled={pending} error={Boolean(err.type)} helperText={err.type}>
              {KIND_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField name="position" label="ตำแหน่ง" defaultValue={staff?.position ?? ""} fullWidth disabled={pending} error={Boolean(err.position)} helperText={err.position} placeholder="เช่น หัวหน้ากลุ่มสาระคณิตศาสตร์" />
          </div>

          {/* ── ข้อมูลส่วนบุคคล ───────────────────────────── */}
          <SectionHeading>ข้อมูลส่วนบุคคล</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField name="birthDate" label="วัน/เดือน/ปีเกิด" defaultValue={staff?.birthDate ?? ""} fullWidth disabled={pending} error={Boolean(err.birthDate)} helperText={err.birthDate} {...dateProps} />
            <TextField name="nationalId" label="เลขบัตรประจำตัวประชาชน" defaultValue={staff?.nationalId ?? ""} fullWidth disabled={pending} error={Boolean(err.nationalId)} helperText={err.nationalId} placeholder="13 หลัก" slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 17 } }} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField name="phone" label="เบอร์โทรศัพท์" defaultValue={staff?.phone ?? ""} fullWidth disabled={pending} error={Boolean(err.phone)} helperText={err.phone} />
            <TextField name="email" label="อีเมล" type="email" defaultValue={staff?.email ?? ""} fullWidth disabled={pending} error={Boolean(err.email)} helperText={err.email} />
          </div>

          {/* ── ข้อมูลราชการและใบประกอบวิชาชีพ ─────────────── */}
          <SectionHeading>ข้อมูลราชการและใบประกอบวิชาชีพ</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField name="positionNumber" label="เลขที่ตำแหน่ง" defaultValue={staff?.positionNumber ?? ""} fullWidth disabled={pending} error={Boolean(err.positionNumber)} helperText={err.positionNumber} />
            <TextField name="salary" label="เงินเดือนปัจจุบัน (บาท)" defaultValue={staff?.salary ?? ""} fullWidth disabled={pending} error={Boolean(err.salary)} helperText={err.salary} slotProps={{ htmlInput: { inputMode: "numeric" } }} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField name="licenseNumber" label="เลขที่ใบอนุญาตประกอบวิชาชีพ" defaultValue={staff?.licenseNumber ?? ""} fullWidth disabled={pending} error={Boolean(err.licenseNumber)} helperText={err.licenseNumber} />
            <TextField name="licenseExpiry" label="วันหมดอายุใบประกอบวิชาชีพ" defaultValue={staff?.licenseExpiry ?? ""} fullWidth disabled={pending} error={Boolean(err.licenseExpiry)} helperText={err.licenseExpiry} {...dateProps} />
          </div>

          {/* ── วุฒิการศึกษา — ปริญญาตรี ────────────────────── */}
          <SectionHeading>วุฒิการศึกษา — ปริญญาตรี</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TextField name="degreeBachelor" label="คุณวุฒิ" defaultValue={staff?.degreeBachelor ?? ""} fullWidth disabled={pending} error={Boolean(err.degreeBachelor)} helperText={err.degreeBachelor} placeholder="เช่น ค.บ." />
            <TextField name="fieldBachelor" label="สาขา" defaultValue={staff?.fieldBachelor ?? ""} fullWidth disabled={pending} error={Boolean(err.fieldBachelor)} helperText={err.fieldBachelor} />
            <TextField name="universityBachelor" label="มหาวิทยาลัย" defaultValue={staff?.universityBachelor ?? ""} fullWidth disabled={pending} error={Boolean(err.universityBachelor)} helperText={err.universityBachelor} />
          </div>

          {/* ── วุฒิการศึกษา — ปริญญาโท ─────────────────────── */}
          <SectionHeading>วุฒิการศึกษา — ปริญญาโท (ถ้ามี)</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TextField name="degreeMaster" label="คุณวุฒิ" defaultValue={staff?.degreeMaster ?? ""} fullWidth disabled={pending} error={Boolean(err.degreeMaster)} helperText={err.degreeMaster} placeholder="เช่น ค.ม." />
            <TextField name="fieldMaster" label="สาขา" defaultValue={staff?.fieldMaster ?? ""} fullWidth disabled={pending} error={Boolean(err.fieldMaster)} helperText={err.fieldMaster} />
            <TextField name="universityMaster" label="มหาวิทยาลัย" defaultValue={staff?.universityMaster ?? ""} fullWidth disabled={pending} error={Boolean(err.universityMaster)} helperText={err.universityMaster} />
          </div>
        </div>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={pending} variant="text">
          ยกเลิก
        </Button>
        <Button type="submit" disabled={pending} variant="contained">
          {pending ? "กำลังบันทึก…" : isEdit ? "บันทึก" : "เพิ่มบุคลากร"}
        </Button>
      </DialogActions>
    </form>
  );
}
