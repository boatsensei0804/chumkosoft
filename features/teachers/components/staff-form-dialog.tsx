"use client";

import { useActionState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
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
  canManageAccounts: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function StaffFormDialog({ open, staff, canManageAccounts, onClose, onSaved }: StaffFormDialogProps): React.ReactNode {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[min(90dvh,900px)] flex-col overflow-hidden p-0 sm:max-w-2xl">
        {open && <StaffFormBody key={staff?.id ?? "new"} staff={staff} canManageAccounts={canManageAccounts} onClose={onClose} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }): React.ReactNode {
  return <p className="mt-1 border-t border-line pt-3 text-xs font-semibold uppercase tracking-wider text-faint">{children}</p>;
}

function StaffFormBody({
  staff,
  canManageAccounts,
  onClose,
  onSaved,
}: {
  staff: StaffSummary | null;
  canManageAccounts: boolean;
  onClose: () => void;
  onSaved: () => void;
}): React.ReactNode {
  const [state, formAction, pending] = useActionState(saveStaffAction, idleAction);
  const isEdit = staff !== null;
  const err = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  function txt(name: string, label: string, value: string | number | null, opts?: { type?: string; placeholder?: string; required?: boolean; helper?: string }): React.ReactNode {
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
        {(err[name] ?? opts?.helper) && <p className={err[name] ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{err[name] ?? opts?.helper}</p>}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <DialogHeader className="shrink-0 border-b border-line px-6 py-5 pr-14 text-left">
        <DialogTitle>{isEdit ? "แก้ไขข้อมูลบุคลากร" : "เพิ่มบุคลากร"}</DialogTitle>
      </DialogHeader>

      {staff && <input type="hidden" name="id" value={staff.id} />}

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
      {state.message && !state.ok && (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.message}</p>
      )}

      <div className="flex flex-col gap-4">
        {/* ── ข้อมูลทั่วไป ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[130px_1fr]">
          {txt("prefix", "คำนำหน้า", staff?.prefix ?? null, { placeholder: "อ." })}
          {txt("staffCode", "รหัสบุคลากร", staff?.code ?? null, { placeholder: "เช่น T-001", required: true })}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {txt("firstName", "ชื่อ", staff?.firstName ?? null, { required: true })}
          {txt("lastName", "นามสกุล", staff?.lastName ?? null, { required: true })}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type">ประเภทบุคลากร</Label>
            <NativeSelect id="type" name="type" defaultValue={staff?.type ?? "TEACHER"} disabled={pending} invalid={Boolean(err.type)}>
              {KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </NativeSelect>
            {err.type && <p className="text-xs text-destructive">{err.type}</p>}
          </div>
          {txt("position", "ตำแหน่ง", staff?.position ?? null, { placeholder: "เช่น หัวหน้ากลุ่มสาระคณิตศาสตร์" })}
        </div>

        <details className="group rounded-xl border border-line bg-surface px-4">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 py-3 text-sm font-semibold text-ink-strong [&::-webkit-details-marker]:hidden">
            <span>ข้อมูลส่วนบุคคล</span>
            <span className="text-xs font-normal text-muted">วันเกิด บัตรประชาชน และช่องทางติดต่อ</span>
          </summary>
          <div className="flex flex-col gap-4 border-t border-line py-4">
        <SectionHeading>ข้อมูลส่วนบุคคล</SectionHeading>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {txt("birthDate", "วัน/เดือน/ปีเกิด", staff?.birthDate ?? null, { type: "date" })}
          {txt("nationalId", "เลขบัตรประจำตัวประชาชน", staff?.nationalId ?? null, { placeholder: "13 หลัก" })}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {txt("phone", "เบอร์โทรศัพท์", staff?.phone ?? null)}
          {txt("email", "อีเมล", staff?.email ?? null, { type: "email" })}
        </div>
          </div>
        </details>

        {canManageAccounts && (
          <>
            <SectionHeading>บัญชีเข้าสู่ระบบ</SectionHeading>
            {staff?.loginEmail && (
              <p className="text-xs text-muted-foreground">มีบัญชีเข้าสู่ระบบเชื่อมกับข้อมูลบุคลากรนี้: {staff.loginEmail}</p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loginPassword">{staff?.loginEmail ? "ตั้งรหัสผ่านใหม่ (เว้นว่างหากไม่เปลี่ยน)" : "รหัสผ่านเริ่มต้น (เว้นว่างหากยังไม่สร้างบัญชี)"}</Label>
              <Input
                id="loginPassword"
                name="loginPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={100}
                disabled={pending}
                aria-invalid={Boolean(err.loginPassword)}
              />
              <p className={err.loginPassword ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                {err.loginPassword ?? "เมื่อกำหนดรหัสผ่าน ระบบจะสร้างหรือรีเซ็ตบัญชีที่เชื่อมกับข้อมูลบุคลากรนี้ ใช้เลขบัตรประชาชนหรืออีเมลเข้าสู่ระบบได้"}
              </p>
            </div>
          </>
        )}

        <details className="group rounded-xl border border-line bg-surface px-4">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 py-3 text-sm font-semibold text-ink-strong [&::-webkit-details-marker]:hidden">
            <span>ข้อมูลวิชาชีพและการศึกษา</span>
            <span className="text-xs font-normal text-muted">ข้อมูลราชการ ใบประกอบวิชาชีพ และวุฒิการศึกษา</span>
          </summary>
          <div className="flex flex-col gap-4 border-t border-line py-4">
        {/* ── ข้อมูลราชการและใบประกอบวิชาชีพ ── */}
        <SectionHeading>ข้อมูลราชการและใบประกอบวิชาชีพ</SectionHeading>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {txt("positionNumber", "เลขที่ตำแหน่ง", staff?.positionNumber ?? null)}
          {txt("salary", "เงินเดือนปัจจุบัน (บาท)", staff?.salary ?? null, { type: "number" })}
          {txt("licenseNumber", "เลขที่ใบอนุญาตประกอบวิชาชีพ", staff?.licenseNumber ?? null)}
          {txt("licenseExpiry", "วันหมดอายุใบประกอบวิชาชีพ", staff?.licenseExpiry ?? null, { type: "date" })}
        </div>

        {/* ── วุฒิการศึกษา — ปริญญาตรี ── */}
        <SectionHeading>วุฒิการศึกษา — ปริญญาตรี</SectionHeading>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {txt("degreeBachelor", "คุณวุฒิ", staff?.degreeBachelor ?? null, { placeholder: "เช่น ค.บ." })}
          {txt("fieldBachelor", "สาขา", staff?.fieldBachelor ?? null)}
          {txt("universityBachelor", "มหาวิทยาลัย", staff?.universityBachelor ?? null)}
        </div>

        {/* ── วุฒิการศึกษา — ปริญญาโท ── */}
        <SectionHeading>วุฒิการศึกษา — ปริญญาโท (ถ้ามี)</SectionHeading>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {txt("degreeMaster", "คุณวุฒิ", staff?.degreeMaster ?? null, { placeholder: "เช่น ค.ม." })}
          {txt("fieldMaster", "สาขา", staff?.fieldMaster ?? null)}
          {txt("universityMaster", "มหาวิทยาลัย", staff?.universityMaster ?? null)}
        </div>
          </div>
        </details>
      </div>
      </div>

      <DialogFooter className="shrink-0 border-t border-line bg-bg px-6 py-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
          ยกเลิก
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "กำลังบันทึก…" : isEdit ? "บันทึก" : "เพิ่มบุคลากร"}
        </Button>
      </DialogFooter>
    </form>
  );
}
