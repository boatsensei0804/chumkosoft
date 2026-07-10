"use client";

import { useActionState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { saveClassroomAction } from "@/features/classrooms/actions";
import { idleAction } from "@/types/form";
import type { ClassroomRow, TeacherOption } from "@/features/classrooms/types";

interface ClassroomFormDialogProps {
  open: boolean;
  classroom: ClassroomRow | null;
  teachers: TeacherOption[];
  onClose: () => void;
  onSaved: () => void;
}

export default function ClassroomFormDialog({ open, classroom, teachers, onClose, onSaved }: ClassroomFormDialogProps): React.ReactNode {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        {open && <Body key={classroom?.id ?? "new"} classroom={classroom} teachers={teachers} onClose={onClose} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}

function Body({
  classroom,
  teachers,
  onClose,
  onSaved,
}: {
  classroom: ClassroomRow | null;
  teachers: TeacherOption[];
  onClose: () => void;
  onSaved: () => void;
}): React.ReactNode {
  const [state, formAction, pending] = useActionState(saveClassroomAction, idleAction);
  const isEdit = classroom !== null;
  const err = state.fieldErrors ?? {};
  const advisorIds = classroom?.advisors.map((a) => a.id) ?? [];

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  return (
    <form action={formAction}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "แก้ไขห้องเรียน" : "เพิ่มห้องเรียน"}</DialogTitle>
      </DialogHeader>

      {classroom && <input type="hidden" name="id" value={classroom.id} />}

      {state.message && !state.ok && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.message}</p>
      )}

      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="classroom-code">ชื่อห้อง</Label>
          <Input id="classroom-code" name="code" defaultValue={classroom?.code ?? ""} required autoFocus disabled={pending} aria-invalid={Boolean(err.code)} placeholder="เช่น ม.4/1" />
          {err.code && <p className="text-xs text-destructive">{err.code}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="classroom-grade">ระดับชั้น</Label>
          <Input id="classroom-grade" name="gradeLevel" defaultValue={classroom?.gradeLevel ?? ""} required disabled={pending} aria-invalid={Boolean(err.gradeLevel)} placeholder="เช่น มัธยมปลาย" />
          {err.gradeLevel && <p className="text-xs text-destructive">{err.gradeLevel}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>ครูที่ปรึกษา (เลือกได้หลายคน)</Label>
          <div className={cn("flex max-h-52 flex-col gap-1 overflow-y-auto rounded-md border border-input p-2", err.advisorIds && "border-destructive")}>
            {teachers.length === 0 ? (
              <p className="px-1 py-2 text-[13px] text-faint">ยังไม่มีครูในระบบ</p>
            ) : (
              teachers.map((t) => {
                const id = `advisor-${t.id}`;
                return (
                  <div key={t.id} className="flex items-center gap-2 rounded-sm px-1.5 py-1.5 hover:bg-surface-2">
                    <Checkbox id={id} name="advisorIds" value={t.id} defaultChecked={advisorIds.includes(t.id)} disabled={pending} />
                    <Label htmlFor={id} className="w-full cursor-pointer text-[13.5px] font-normal">
                      {t.name}
                    </Label>
                  </div>
                );
              })
            )}
          </div>
          <p className={cn("text-xs", err.advisorIds ? "text-destructive" : "text-muted-foreground")}>
            {err.advisorIds ?? "เลือกครูประจำชั้น เลือกได้มากกว่า 1 คน (เว้นว่างได้)"}
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
          ยกเลิก
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "กำลังบันทึก…" : isEdit ? "บันทึก" : "เพิ่มห้องเรียน"}
        </Button>
      </DialogFooter>
    </form>
  );
}
