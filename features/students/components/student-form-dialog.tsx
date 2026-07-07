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
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import { saveStudentAction } from "@/features/students/actions";
import { idleAction } from "@/types/form";
import {
  BLOOD_TYPES,
  RELIGIONS,
  STUDY_PLANS,
  COMMUTE_METHODS,
  COMMUTE_ROAD_TYPES,
  PARENT_MARITAL_STATUSES,
  DISADVANTAGES,
  SHORTAGES,
  DISABILITIES,
} from "@/features/students/constants";
import type { StudentSummary, ClassroomOption } from "@/features/dashboard/types";

interface StudentFormDialogProps {
  open: boolean;
  student: StudentSummary | null;
  classrooms: ClassroomOption[];
  onClose: () => void;
  onSaved: () => void;
}

export default function StudentFormDialog({ open, student, classrooms, onClose, onSaved }: StudentFormDialogProps): React.ReactNode {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" slotProps={{ paper: { sx: { borderRadius: "var(--radius-lg)" } } }} aria-labelledby="student-form-title">
      {open && <StudentFormBody key={student?.id ?? "new"} student={student} classrooms={classrooms} onClose={onClose} onSaved={onSaved} />}
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
  const err = state.fieldErrors ?? {};
  const s = student;

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  function txt(name: string, label: string, value: string | number | null, opts?: { type?: string; placeholder?: string; date?: boolean }): React.ReactNode {
    return (
      <TextField
        name={name}
        label={label}
        defaultValue={value ?? ""}
        type={opts?.date ? "date" : opts?.type}
        placeholder={opts?.placeholder}
        fullWidth
        disabled={pending}
        error={Boolean(err[name])}
        helperText={err[name]}
        slotProps={opts?.date ? { inputLabel: { shrink: true } } : opts?.type === "number" ? { htmlInput: { inputMode: "numeric" } } : undefined}
      />
    );
  }

  function sel(name: string, label: string, value: string | null, options: readonly string[], placeholder = "ไม่ระบุ"): React.ReactNode {
    return (
      <TextField name={name} label={label} select defaultValue={value ?? ""} fullWidth disabled={pending} error={Boolean(err[name])} helperText={err[name]}>
        <MenuItem value="">{placeholder}</MenuItem>
        {options.map((o) => (
          <MenuItem key={o} value={o}>
            {o}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  function checkGroup(name: string, options: readonly string[], selected: string[]): React.ReactNode {
    return (
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((o) => (
          <FormControlLabel
            key={o}
            control={<Checkbox name={name} value={o} defaultChecked={selected.includes(o)} size="small" disabled={pending} />}
            label={<span className="text-[13.5px]">{o}</span>}
          />
        ))}
      </div>
    );
  }

  return (
    <form action={formAction}>
      <DialogTitle id="student-form-title" sx={{ fontWeight: 700, color: "var(--ink-strong)" }}>
        {isEdit ? "แก้ไขข้อมูลนักเรียน" : "เพิ่มนักเรียน"}
      </DialogTitle>

      <DialogContent>
        {s && <input type="hidden" name="id" value={s.id} />}
        {state.message && !state.ok && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: "var(--radius-sm)" }}>
            {state.message}
          </Alert>
        )}

        <div className="flex flex-col gap-4 pt-1">
          {/* ── ข้อมูลทั่วไป ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_1fr]">
            {txt("prefix", "คำนำหน้า", s?.prefix ?? null, { placeholder: "ด.ช. / น.ส." })}
            {txt("studentCode", "รหัสนักเรียน", s?.code ?? null, { placeholder: "เช่น 68-0421" })}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {txt("firstName", "ชื่อ", s?.firstName ?? null)}
            {txt("lastName", "นามสกุล", s?.lastName ?? null)}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {txt("firstNameEn", "ชื่อ (อังกฤษ)", s?.firstNameEn ?? null)}
            {txt("lastNameEn", "นามสกุล (อังกฤษ)", s?.lastNameEn ?? null)}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {sel("gender", "เพศ", s?.gender ?? null, ["ชาย", "หญิง"])}
            {txt("birthDate", "วันเกิด", s?.birthDate ?? null, { date: true })}
            {txt("nationalId", "เลขบัตรประชาชน", s?.nationalId ?? null, { placeholder: "13 หลัก" })}
          </div>
          <TextField
            name="classroomId"
            label="ชั้นเรียน (ภาคเรียนปัจจุบัน)"
            select
            defaultValue={s?.currentClassroomId ?? ""}
            fullWidth
            disabled={pending}
            error={Boolean(err.classroomId)}
            helperText={err.classroomId ?? "เลือกเพื่อลงทะเบียนเข้าชั้นเรียนในภาคเรียนนี้"}
          >
            <MenuItem value="">ยังไม่กำหนด</MenuItem>
            {classrooms.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.code} · {c.gradeLevel}
              </MenuItem>
            ))}
          </TextField>

          {/* ── ตัวตน / ติดต่อ ── */}
          <SectionHeading>ข้อมูลตัวตนและติดต่อ</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {txt("ethnicity", "เชื้อชาติ", s?.ethnicity ?? null)}
            {txt("nationality", "สัญชาติ", s?.nationality ?? null)}
            {sel("religion", "ศาสนา", s?.religion ?? null, RELIGIONS)}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {sel("bloodType", "กรุ๊ปเลือด", s?.bloodType ?? null, BLOOD_TYPES)}
            {txt("primaryLanguage", "ภาษาหลักที่ใช้สื่อสาร", s?.primaryLanguage ?? null)}
            {txt("phone", "เบอร์โทรศัพท์", s?.phone ?? null)}
          </div>
          {txt("email", "อีเมล", s?.email ?? null, { type: "email" })}

          {/* ── การเกิด / การศึกษาเดิม ── */}
          <SectionHeading>การเกิดและการศึกษาเดิม</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {txt("birthHospital", "โรงพยาบาลที่เกิด", s?.birthHospital ?? null)}
            {txt("birthTambon", "ตำบลที่เกิด", s?.birthTambon ?? null)}
            {txt("birthAmphoe", "อำเภอที่เกิด", s?.birthAmphoe ?? null)}
            {txt("birthProvince", "จังหวัดที่เกิด", s?.birthProvince ?? null)}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {txt("previousSchool", "สถานศึกษาเดิม", s?.previousSchool ?? null)}
            {sel("studyPlan", "แผนการเรียน", s?.studyPlan ?? null, STUDY_PLANS)}
          </div>

          {/* ── สุขภาพ ── */}
          <SectionHeading>สุขภาพ</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {txt("weightKg", "น้ำหนัก (กก.)", s?.weightKg ?? null, { type: "number" })}
            {txt("heightCm", "ส่วนสูง (ซม.)", s?.heightCm ?? null, { type: "number" })}
            {txt("chronicDisease", "โรคประจำตัว", s?.chronicDisease ?? null)}
          </div>

          {/* ── ที่อยู่ตามทะเบียนบ้าน ── */}
          <SectionHeading>ที่อยู่ตามทะเบียนบ้าน</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {txt("regHouseRegNo", "รหัสประจำบ้าน", s?.regHouseRegNo ?? null)}
            {txt("regHouseNo", "บ้านเลขที่", s?.regHouseNo ?? null)}
            {txt("regMoo", "หมู่ที่", s?.regMoo ?? null)}
            {txt("regSoi", "ตรอก/ซอย", s?.regSoi ?? null)}
            {txt("regRoad", "ถนน", s?.regRoad ?? null)}
            {txt("regTambon", "ตำบล/แขวง", s?.regTambon ?? null)}
            {txt("regAmphoe", "อำเภอ/เขต", s?.regAmphoe ?? null)}
            {txt("regProvince", "จังหวัด", s?.regProvince ?? null)}
            {txt("regPostalCode", "รหัสไปรษณีย์", s?.regPostalCode ?? null)}
          </div>

          {/* ── ที่อยู่ปัจจุบัน ── */}
          <SectionHeading>ที่อยู่ปัจจุบัน</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {txt("curHouseRegNo", "รหัสประจำบ้าน", s?.curHouseRegNo ?? null)}
            {txt("curHouseNo", "บ้านเลขที่", s?.curHouseNo ?? null)}
            {txt("curMoo", "หมู่ที่", s?.curMoo ?? null)}
            {txt("curSoi", "ตรอก/ซอย", s?.curSoi ?? null)}
            {txt("curRoad", "ถนน", s?.curRoad ?? null)}
            {txt("curTambon", "ตำบล/แขวง", s?.curTambon ?? null)}
            {txt("curAmphoe", "อำเภอ/เขต", s?.curAmphoe ?? null)}
            {txt("curProvince", "จังหวัด", s?.curProvince ?? null)}
            {txt("curPostalCode", "รหัสไปรษณีย์", s?.curPostalCode ?? null)}
          </div>

          {/* ── การเดินทาง ── */}
          <SectionHeading>การเดินทางมาโรงเรียน</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {sel("commuteMethod", "วิธีการเดินทาง", s?.commuteMethod ?? null, COMMUTE_METHODS)}
            {sel("commuteRoadType", "ประเภทเส้นทาง", s?.commuteRoadType ?? null, COMMUTE_ROAD_TYPES)}
            {txt("commuteDistanceM", "ระยะทางจากโรงเรียน (เมตร)", s?.commuteDistanceM ?? null, { type: "number" })}
            {txt("commuteMinutes", "ระยะเวลาเดินทาง (นาที)", s?.commuteMinutes ?? null, { type: "number" })}
          </div>

          {/* ── สถานภาพครอบครัว ── */}
          <SectionHeading>สถานภาพครอบครัว</SectionHeading>
          {sel("parentMaritalStatus", "สถานภาพบิดามารดา", s?.parentMaritalStatus ?? null, PARENT_MARITAL_STATUSES)}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {txt("siblingsOlderBrothers", "จำนวนพี่ชาย", s?.siblingsOlderBrothers ?? null, { type: "number" })}
            {txt("siblingsOlderSisters", "จำนวนพี่สาว", s?.siblingsOlderSisters ?? null, { type: "number" })}
            {txt("siblingsYoungerBrothers", "จำนวนน้องชาย", s?.siblingsYoungerBrothers ?? null, { type: "number" })}
            {txt("siblingsYoungerSisters", "จำนวนน้องสาว", s?.siblingsYoungerSisters ?? null, { type: "number" })}
            {txt("birthOrder", "เป็นบุตรคนที่", s?.birthOrder ?? null, { type: "number" })}
            {txt("dependantsCount", "จำนวนที่อุปการะ", s?.dependantsCount ?? null, { type: "number" })}
          </div>

          {/* ── กลุ่มพิเศษ (DMC) ── */}
          <SectionHeading>เด็กด้อยโอกาส (เลือกได้หลายข้อ)</SectionHeading>
          {checkGroup("disadvantages", DISADVANTAGES, s?.disadvantages ?? [])}
          <SectionHeading>การขาดแคลน (เลือกได้หลายข้อ)</SectionHeading>
          {checkGroup("shortages", SHORTAGES, s?.shortages ?? [])}
          <SectionHeading>ความพิการ (เลือกได้หลายข้อ)</SectionHeading>
          {checkGroup("disabilities", DISABILITIES, s?.disabilities ?? [])}
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
