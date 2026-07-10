"use client";

import { useActionState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {open && <CourseFormBody key={course?.id ?? "new"} course={course} onClose={onClose} onSaved={onSaved} />}
      </DialogContent>
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
  const err = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  return (
    <form action={formAction}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "แก้ไขรายวิชา" : "เพิ่มรายวิชา"}</DialogTitle>
      </DialogHeader>

      {course && <input type="hidden" name="id" value={course.id} />}

      {state.message && !state.ok && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.message}</p>
      )}

      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="course-code">รหัสวิชา</Label>
          <Input id="course-code" name="code" defaultValue={course?.code ?? ""} required autoFocus disabled={pending} aria-invalid={Boolean(err.code)} placeholder="เช่น ค30201" />
          {err.code && <p className="text-xs text-destructive">{err.code}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="course-name">ชื่อรายวิชา</Label>
          <Input id="course-name" name="name" defaultValue={course?.name ?? ""} required disabled={pending} aria-invalid={Boolean(err.name)} placeholder="เช่น คณิตศาสตร์เพิ่มเติม" />
          {err.name && <p className="text-xs text-destructive">{err.name}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="course-credits">หน่วยกิต</Label>
          <Input id="course-credits" name="credits" type="number" step={0.5} min={0} max={20} defaultValue={course?.credits ?? ""} disabled={pending} aria-invalid={Boolean(err.credits)} />
          <p className={err.credits ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{err.credits ?? "เว้นว่างได้หากไม่มีหน่วยกิต"}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="course-description">คำอธิบายรายวิชา</Label>
          <Textarea id="course-description" name="description" defaultValue={course?.description ?? ""} rows={3} disabled={pending} aria-invalid={Boolean(err.description)} />
          {err.description && <p className="text-xs text-destructive">{err.description}</p>}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
          ยกเลิก
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "กำลังบันทึก…" : isEdit ? "บันทึก" : "เพิ่มรายวิชา"}
        </Button>
      </DialogFooter>
    </form>
  );
}
