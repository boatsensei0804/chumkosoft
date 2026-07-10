"use client";

import { useActionState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { saveTermAction } from "@/features/settings/actions";
import { idleAction } from "@/types/form";
import type { TermSetting } from "@/features/settings/types";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "UPCOMING", label: "รอเปิดเทอม" },
  { value: "ACTIVE", label: "กำลังเรียน" },
  { value: "CLOSED", label: "ปิดแล้ว" },
];

interface TermFormDialogProps {
  open: boolean;
  academicYearId: string;
  term: TermSetting | null;
  suggestedNumber: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function TermFormDialog({ open, academicYearId, term, suggestedNumber, onClose, onSaved }: TermFormDialogProps): React.ReactNode {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-sm">
        {open && <Body key={term?.id ?? "new"} academicYearId={academicYearId} term={term} suggestedNumber={suggestedNumber} onClose={onClose} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}

function Body({
  academicYearId,
  term,
  suggestedNumber,
  onClose,
  onSaved,
}: {
  academicYearId: string;
  term: TermSetting | null;
  suggestedNumber: number;
  onClose: () => void;
  onSaved: () => void;
}): React.ReactNode {
  const [state, formAction, pending] = useActionState(saveTermAction, idleAction);
  const isEdit = term !== null;
  const err = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  return (
    <form action={formAction}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "แก้ไขภาคเรียน" : "เพิ่มภาคเรียน"}</DialogTitle>
      </DialogHeader>

      <input type="hidden" name="academicYearId" value={academicYearId} />
      {term && <input type="hidden" name="id" value={term.id} />}

      {state.message && !state.ok && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.message}</p>
      )}

      <div className="flex flex-col gap-4 py-4">
        <div className="grid grid-cols-[110px_1fr] gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="term-number">ภาคเรียนที่</Label>
            <Input id="term-number" name="number" type="number" min={1} max={6} defaultValue={term?.number ?? suggestedNumber} required disabled={pending} aria-invalid={Boolean(err.number)} />
            {err.number && <p className="text-xs text-destructive">{err.number}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="term-name">ชื่อภาคเรียน</Label>
            <Input id="term-name" name="name" defaultValue={term?.name ?? ""} required autoFocus disabled={pending} aria-invalid={Boolean(err.name)} placeholder="เช่น ภาคเรียนที่ 1" />
            {err.name && <p className="text-xs text-destructive">{err.name}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="term-start">วันเปิดภาคเรียน</Label>
          <Input id="term-start" name="startDate" type="date" defaultValue={term?.startDate ?? ""} required disabled={pending} aria-invalid={Boolean(err.startDate)} />
          {err.startDate && <p className="text-xs text-destructive">{err.startDate}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="term-end">วันปิดภาคเรียน</Label>
          <Input id="term-end" name="endDate" type="date" defaultValue={term?.endDate ?? ""} required disabled={pending} aria-invalid={Boolean(err.endDate)} />
          {err.endDate && <p className="text-xs text-destructive">{err.endDate}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="term-status">สถานะ</Label>
          <NativeSelect id="term-status" name="status" defaultValue={term?.status ?? "UPCOMING"} required disabled={pending}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
          ยกเลิก
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "กำลังบันทึก…" : isEdit ? "บันทึก" : "เพิ่ม"}
        </Button>
      </DialogFooter>
    </form>
  );
}
