"use client";

import { useActionState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { addOfferingAction } from "@/features/classrooms/offering-actions";
import { idleAction } from "@/types/form";
import type { OfferingOptions } from "@/features/classrooms/types";

interface OfferingFormDialogProps {
  open: boolean;
  classroomId: string;
  options: OfferingOptions;
  /** When set, the offering is created under this term (the timetable's viewed term). */
  termId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function OfferingFormDialog({ open, classroomId, termId, options, onClose, onSaved }: OfferingFormDialogProps): React.ReactNode {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        {open && <Body key={`${classroomId}:${termId ?? ""}`} classroomId={classroomId} termId={termId} options={options} onClose={onClose} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}

function Body({ classroomId, termId, options, onClose, onSaved }: { classroomId: string; termId?: string; options: OfferingOptions; onClose: () => void; onSaved: () => void }): React.ReactNode {
  const [state, formAction, pending] = useActionState(addOfferingAction, idleAction);
  const err = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  return (
    <form action={formAction}>
      <DialogHeader>
        <DialogTitle>เพิ่มรายวิชาให้ห้องเรียน</DialogTitle>
      </DialogHeader>

      <input type="hidden" name="classroomId" value={classroomId} />
      {termId && <input type="hidden" name="termId" value={termId} />}

      {state.message && !state.ok && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.message}</p>
      )}

      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="offering-course">รายวิชา</Label>
          <NativeSelect id="offering-course" name="courseId" defaultValue="" required disabled={pending} invalid={Boolean(err.courseId)}>
            <option value="">เลือกรายวิชา…</option>
            {options.courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </NativeSelect>
          {err.courseId && <p className="text-xs text-destructive">{err.courseId}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="offering-teacher">ผู้สอน</Label>
          <NativeSelect id="offering-teacher" name="teacherId" defaultValue="" required disabled={pending} invalid={Boolean(err.teacherId)}>
            <option value="">เลือกผู้สอน…</option>
            {options.teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
          {err.teacherId && <p className="text-xs text-destructive">{err.teacherId}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="offering-room">ห้องเรียน/ห้องปฏิบัติการ</Label>
          <NativeSelect id="offering-room" name="roomId" defaultValue="" required disabled={pending} invalid={Boolean(err.roomId)}>
            <option value="">เลือกห้อง…</option>
            {options.rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </NativeSelect>
          {err.roomId && <p className="text-xs text-destructive">{err.roomId}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="offering-periods">จำนวนคาบต่อสัปดาห์</Label>
          <Input id="offering-periods" name="periodsPerWeek" type="number" min={1} max={20} defaultValue={1} required disabled={pending} aria-invalid={Boolean(err.periodsPerWeek)} />
          {err.periodsPerWeek && <p className="text-xs text-destructive">{err.periodsPerWeek}</p>}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
          ยกเลิก
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "กำลังบันทึก…" : "เพิ่มรายวิชา"}
        </Button>
      </DialogFooter>
    </form>
  );
}
