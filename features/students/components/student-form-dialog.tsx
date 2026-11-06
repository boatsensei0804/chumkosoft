"use client";

import { useActionState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
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
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[min(90dvh,900px)] flex-col overflow-hidden p-0 sm:max-w-3xl">
        {open && <StudentFormBody key={student?.id ?? "new"} student={student} classrooms={classrooms} onClose={onClose} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }): React.ReactNode {
  return <p className="mt-1 border-t border-line pt-3 text-xs font-semibold uppercase tracking-wider text-faint">{children}</p>;
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

  function txt(name: string, label: string, value: string | number | null, opts?: { type?: string; placeholder?: string; required?: boolean }): React.ReactNode {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={name}>{label}</Label>
        <Input
          id={name}
          name={name}
          type={opts?.type}
          defaultValue={value ?? ""}
          placeholder={opts?.placeholder}
          required={opts?.required}
          disabled={pending}
          aria-invalid={Boolean(err[name])}
          inputMode={opts?.type === "number" ? "numeric" : undefined}
        />
        {err[name] && <p className="text-xs text-destructive">{err[name]}</p>}
      </div>
    );
  }

  function sel(name: string, label: string, value: string | null, options: readonly string[], placeholder = "ไม่ระบุ"): React.ReactNode {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={name}>{label}</Label>
        <NativeSelect id={name} name={name} defaultValue={value ?? ""} disabled={pending} invalid={Boolean(err[name])}>
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </NativeSelect>
        {err[name] && <p className="text-xs text-destructive">{err[name]}</p>}
      </div>
    );
  }

  function checkGroup(name: string, options: readonly string[], selectedValues: string[]): React.ReactNode {
    return (
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((o) => {
          const id = `${name}-${o}`;
          return (
            <div key={o} className="flex items-center gap-2">
              <Checkbox id={id} name={name} value={o} defaultChecked={selectedValues.includes(o)} disabled={pending} />
              <Label htmlFor={id} className="cursor-pointer text-[13.5px] font-normal">
                {o}
              </Label>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <DialogHeader className="shrink-0 border-b border-line px-6 py-5 pr-14 text-left">
        <DialogTitle>{isEdit ? "แก้ไขข้อมูลนักเรียน" : "เพิ่มนักเรียน"}</DialogTitle>
      </DialogHeader>

      {s && <input type="hidden" name="id" value={s.id} />}

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
      {state.message && !state.ok && (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.message}</p>
      )}

      <div className="flex flex-col gap-4">
        {/* ── ข้อมูลทั่วไป ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[130px_1fr]">
          {txt("prefix", "คำนำหน้า", s?.prefix ?? null, { placeholder: "ด.ช. / น.ส." })}
          {txt("studentCode", "รหัสนักเรียน", s?.code ?? null, { placeholder: "เช่น 68-0421", required: true })}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {txt("firstName", "ชื่อ", s?.firstName ?? null, { required: true })}
          {txt("lastName", "นามสกุล", s?.lastName ?? null, { required: true })}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {txt("firstNameEn", "ชื่อ (อังกฤษ)", s?.firstNameEn ?? null)}
          {txt("lastNameEn", "นามสกุล (อังกฤษ)", s?.lastNameEn ?? null)}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {sel("gender", "เพศ", s?.gender ?? null, ["ชาย", "หญิง"])}
          {txt("birthDate", "วันเกิด", s?.birthDate ?? null, { type: "date" })}
          {txt("nationalId", "เลขบัตรประชาชน", s?.nationalId ?? null, { placeholder: "13 หลัก" })}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="classroomId">ชั้นเรียน (ภาคเรียนปัจจุบัน)</Label>
          <NativeSelect id="classroomId" name="classroomId" defaultValue={s?.currentClassroomId ?? ""} disabled={pending} invalid={Boolean(err.classroomId)}>
            <option value="">ยังไม่กำหนด</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.gradeLevel}
              </option>
            ))}
          </NativeSelect>
          <p className={cn("text-xs", err.classroomId ? "text-destructive" : "text-muted-foreground")}>
            {err.classroomId ?? "เลือกเพื่อลงทะเบียนเข้าชั้นเรียนในภาคเรียนนี้"}
          </p>
        </div>

        <details className="group rounded-xl border border-line bg-surface px-4">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 py-3 text-sm font-semibold text-ink-strong [&::-webkit-details-marker]:hidden">
            <span>ข้อมูลเพิ่มเติม</span>
            <span className="text-xs font-normal text-muted">ข้อมูลติดต่อ สุขภาพ ที่อยู่ และข้อมูลประกอบ</span>
          </summary>
          <div className="flex flex-col gap-4 border-t border-line py-4">
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
        </details>
      </div>
      </div>

      <DialogFooter className="shrink-0 border-t border-line bg-bg px-6 py-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
          ยกเลิก
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "กำลังบันทึก…" : isEdit ? "บันทึก" : "เพิ่มนักเรียน"}
        </Button>
      </DialogFooter>
    </form>
  );
}
