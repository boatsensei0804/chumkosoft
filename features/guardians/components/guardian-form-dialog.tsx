"use client";

import { useActionState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { saveGuardianAction } from "@/features/guardians/actions";
import { idleAction } from "@/types/form";
import { GUARDIAN_RELATIONS, BLOOD_TYPES } from "@/features/students/constants";
import type { GuardianRow } from "@/features/guardians/types";

interface GuardianFormDialogProps {
  open: boolean;
  studentId: string;
  studentName: string;
  guardian: GuardianRow | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function GuardianFormDialog({ open, studentId, studentName, guardian, onClose, onSaved }: GuardianFormDialogProps): React.ReactNode {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        {open && <Body key={guardian?.id ?? `new-${studentId}`} studentId={studentId} studentName={studentName} guardian={guardian} onClose={onClose} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}

function Body({ studentId, studentName, guardian, onClose, onSaved }: { studentId: string; studentName: string; guardian: GuardianRow | null; onClose: () => void; onSaved: () => void }): React.ReactNode {
  const [state, formAction, pending] = useActionState(saveGuardianAction, idleAction);
  const isEdit = guardian !== null;
  const err = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  return (
    <form action={formAction}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "แก้ไขผู้ปกครอง" : "เพิ่มผู้ปกครอง"}</DialogTitle>
      </DialogHeader>

      {guardian ? <input type="hidden" name="id" value={guardian.id} /> : <input type="hidden" name="studentId" value={studentId} />}

      <p className="mt-2 text-sm text-muted-foreground">นักเรียน: {studentName}</p>

      {state.message && !state.ok && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.message}</p>
      )}

      <div className="flex flex-col gap-4 py-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[110px_1fr]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="guardian-prefix">คำนำหน้า</Label>
            <Input id="guardian-prefix" name="prefix" defaultValue={guardian?.prefix ?? ""} disabled={pending} aria-invalid={Boolean(err.prefix)} placeholder="นาย / นาง" />
            {err.prefix && <p className="text-xs text-destructive">{err.prefix}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="guardian-fullname">ชื่อ-นามสกุลผู้ปกครอง</Label>
            <Input id="guardian-fullname" name="fullName" defaultValue={guardian?.fullName ?? ""} required autoFocus disabled={pending} aria-invalid={Boolean(err.fullName)} />
            {err.fullName && <p className="text-xs text-destructive">{err.fullName}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="guardian-relation">ความสัมพันธ์</Label>
          <NativeSelect id="guardian-relation" name="relation" defaultValue={guardian?.relation ?? ""} required disabled={pending} invalid={Boolean(err.relation)}>
            <option value="">เลือกความสัมพันธ์…</option>
            {GUARDIAN_RELATIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </NativeSelect>
          {err.relation && <p className="text-xs text-destructive">{err.relation}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="guardian-nid">เลขบัตรประชาชน</Label>
            <Input id="guardian-nid" name="nationalId" defaultValue={guardian?.nationalId ?? ""} disabled={pending} aria-invalid={Boolean(err.nationalId)} placeholder="13 หลัก" inputMode="numeric" maxLength={17} />
            {err.nationalId && <p className="text-xs text-destructive">{err.nationalId}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="guardian-blood">กรุ๊ปเลือด</Label>
            <NativeSelect id="guardian-blood" name="bloodType" defaultValue={guardian?.bloodType ?? ""} disabled={pending} invalid={Boolean(err.bloodType)}>
              <option value="">ไม่ระบุ</option>
              {BLOOD_TYPES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </NativeSelect>
            {err.bloodType && <p className="text-xs text-destructive">{err.bloodType}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="guardian-occupation">อาชีพ</Label>
            <Input id="guardian-occupation" name="occupation" defaultValue={guardian?.occupation ?? ""} disabled={pending} aria-invalid={Boolean(err.occupation)} />
            {err.occupation && <p className="text-xs text-destructive">{err.occupation}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="guardian-income">รายได้ต่อเดือน (บาท)</Label>
            <Input id="guardian-income" name="monthlyIncome" defaultValue={guardian?.monthlyIncome ?? ""} disabled={pending} aria-invalid={Boolean(err.monthlyIncome)} inputMode="numeric" />
            {err.monthlyIncome && <p className="text-xs text-destructive">{err.monthlyIncome}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="guardian-phone">เบอร์โทร</Label>
          <Input id="guardian-phone" name="phone" defaultValue={guardian?.phone ?? ""} disabled={pending} aria-invalid={Boolean(err.phone)} />
          {err.phone && <p className="text-xs text-destructive">{err.phone}</p>}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
          ยกเลิก
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "กำลังบันทึก…" : isEdit ? "บันทึก" : "เพิ่มผู้ปกครอง"}
        </Button>
      </DialogFooter>
    </form>
  );
}
