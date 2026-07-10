"use client";

import { useActionState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveYearAction } from "@/features/settings/actions";
import { idleAction } from "@/types/form";
import type { AcademicYearSetting } from "@/features/settings/types";

interface YearFormDialogProps {
  open: boolean;
  year: AcademicYearSetting | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function YearFormDialog({ open, year, onClose, onSaved }: YearFormDialogProps): React.ReactNode {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-sm">
        {open && <Body key={year?.id ?? "new"} year={year} onClose={onClose} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}

function Body({ year, onClose, onSaved }: { year: AcademicYearSetting | null; onClose: () => void; onSaved: () => void }): React.ReactNode {
  const [state, formAction, pending] = useActionState(saveYearAction, idleAction);
  const isEdit = year !== null;
  const err = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  return (
    <form action={formAction}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "แก้ไขปีการศึกษา" : "เพิ่มปีการศึกษา"}</DialogTitle>
      </DialogHeader>

      {year && <input type="hidden" name="id" value={year.id} />}

      {state.message && !state.ok && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.message}</p>
      )}

      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="year-by">ปีการศึกษา (พ.ศ.)</Label>
          <Input id="year-by" name="buddhistYear" type="number" defaultValue={year?.buddhistYear ?? ""} required autoFocus disabled={pending} aria-invalid={Boolean(err.buddhistYear)} placeholder="เช่น 2568" />
          {err.buddhistYear && <p className="text-xs text-destructive">{err.buddhistYear}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="year-start">วันเปิดปีการศึกษา</Label>
          <Input id="year-start" name="startDate" type="date" defaultValue={year?.startDate ?? ""} required disabled={pending} aria-invalid={Boolean(err.startDate)} />
          {err.startDate && <p className="text-xs text-destructive">{err.startDate}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="year-end">วันปิดปีการศึกษา</Label>
          <Input id="year-end" name="endDate" type="date" defaultValue={year?.endDate ?? ""} required disabled={pending} aria-invalid={Boolean(err.endDate)} />
          {err.endDate && <p className="text-xs text-destructive">{err.endDate}</p>}
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
