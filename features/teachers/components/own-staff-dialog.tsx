"use client";

import { useActionState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveOwnStaffAction } from "@/features/teachers/actions";
import { idleAction } from "@/types/form";
import type { StaffSummary } from "@/features/teachers/types";

export default function OwnStaffDialog({ open, staff, onClose, onSaved }: {
  open: boolean;
  staff: StaffSummary | null;
  onClose: () => void;
  onSaved: () => void;
}): React.ReactNode {
  return <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
    <DialogContent className="sm:max-w-lg">
      {open && staff && <OwnStaffForm key={staff.id} staff={staff} onClose={onClose} onSaved={onSaved} />}
    </DialogContent>
  </Dialog>;
}

function OwnStaffForm({ staff, onClose, onSaved }: { staff: StaffSummary; onClose: () => void; onSaved: () => void }): React.ReactNode {
  const [state, action, pending] = useActionState(saveOwnStaffAction, idleAction);
  useEffect(() => { if (state.ok) onSaved(); }, [state.ok, onSaved]);
  return <form action={action} className="space-y-4">
    <DialogHeader><DialogTitle>แก้ไขข้อมูลของฉัน</DialogTitle></DialogHeader>
    <p className="text-sm text-muted">แก้ไขชื่อและช่องทางติดต่อได้ ข้อมูลตำแหน่งและบัญชีเข้าสู่ระบบให้ผู้ดูแลระบบจัดการ</p>
    {state.message && !state.ok && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-sm"><Label htmlFor="own-first-name">ชื่อ</Label><Input id="own-first-name" name="firstName" defaultValue={staff.firstName} maxLength={100} required disabled={pending} /></label>
      <label className="space-y-1 text-sm"><Label htmlFor="own-last-name">นามสกุล</Label><Input id="own-last-name" name="lastName" defaultValue={staff.lastName} maxLength={100} required disabled={pending} /></label>
    </div>
    <label className="block space-y-1 text-sm"><Label htmlFor="own-phone">เบอร์โทรศัพท์</Label><Input id="own-phone" name="phone" defaultValue={staff.phone ?? ""} maxLength={30} disabled={pending} /></label>
    <label className="block space-y-1 text-sm"><Label htmlFor="own-email">อีเมลติดต่อ</Label><Input id="own-email" name="email" type="email" defaultValue={staff.email ?? ""} disabled={pending} /></label>
    <DialogFooter><Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button><Button type="submit" disabled={pending}>{pending ? "กำลังบันทึก…" : "บันทึก"}</Button></DialogFooter>
  </form>;
}
