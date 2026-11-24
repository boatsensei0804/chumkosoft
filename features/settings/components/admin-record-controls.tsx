"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { idleAction, type ActionResult } from "@/types/form";
import type { AdminChange, TrashKind } from "../admin-records";
import type { PurgeResult } from "../services/admin-records-service";
import { changeAdminAction, purgeRecordAction, saveAdminAction } from "../admin-records-actions";

type RecordOperation = { change: AdminChange } | { purge: TrashKind };

const captions: Record<AdminChange, string> = {
  enable: "เปิดใช้งาน", disable: "ปิดใช้งาน", archive: "ย้ายไปถังขยะ", restore: "กู้บัญชี",
};

export function RecordActionButton({ operation, id, item }: { operation: RecordOperation; id: string; item: string }): React.ReactNode {
  const [confirmation, setConfirmation] = useState<"single" | "related" | null>(null);
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState<PurgeResult | null>(null);
  const references = failure?.references ?? [];
  const related = failure?.related;
  const purge = "purge" in operation;
  const destructive = purge || ("change" in operation && operation.change === "archive");
  const label = purge ? "ลบถาวร" : captions[operation.change];
  const includingRelated = confirmation === "related" && related;
  const confirmLabel = includingRelated ? "ลบถาวรพร้อมรายการที่เกี่ยวข้อง" : label;
  const message = includingRelated
    ? `ลบ “${item}” พร้อมรายการเปิดสอน ${includingRelated.offerings} รายการและคาบสอน ${includingRelated.slots} คาบในถังขยะ ทั้งชุดจะกู้คืนไม่ได้`
    : purge
    ? `ลบ “${item}” ออกจากระบบถาวร รายการที่ลบแล้วจะกู้คืนไม่ได้`
    : `${label}บัญชี ${item}${operation.change === "restore" ? " บัญชีจะยังปิดใช้งานหลังการกู้คืน" : ""}`;

  function confirm(): void {
    startTransition(async () => {
      const result: PurgeResult = "purge" in operation
        ? await purgeRecordAction(operation.purge, id, includingRelated ? includingRelated.token : undefined)
        : await changeAdminAction(id, operation.change);
      setFailure(result.ok ? null : result);
      if (result.ok) toast.success(result.message);
      else if (!result.references?.length) toast.error(result.message ?? "ดำเนินการไม่สำเร็จ");
      setConfirmation(null);
    });
  }

  return <>
    <Button variant={destructive ? "destructive" : "outline"} className="min-h-10" onClick={() => setConfirmation("single")}>{label}</Button>
    <ConfirmDialog open={confirmation !== null} title={confirmLabel} message={message} pending={pending} destructive={destructive}
      confirmLabel={confirmLabel} onClose={() => setConfirmation(null)} onConfirm={confirm} />
    {purge && references.length > 0 && (
      <div role="alert" className="w-full rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
        <p className="font-semibold">{failure?.message}</p>
        <ul className="mt-1 space-y-1">
          {references.map(({ label, count, archived, trashKind }) => (
            <li key={label}>
              {label} {count.toLocaleString("th-TH")} รายการ
              {archived !== undefined && <> · ยังอยู่นอกถังขยะ {(count - archived).toLocaleString("th-TH")} รายการ</>}
              {trashKind && (archived ?? 0) > 0 && (
                <Link className="ml-2 inline-block font-semibold underline underline-offset-2"
                  href={`/dashboard/settings/records?view=trash&kind=${trashKind}&parent=${encodeURIComponent(`${operation.purge}:${id}`)}`}>
                  ดูในถังขยะ {archived?.toLocaleString("th-TH")} รายการ
                </Link>
              )}
            </li>
          ))}
        </ul>
        {related && <Button size="sm" variant="destructive" className="mt-3 h-auto min-h-10 whitespace-normal"
          onClick={() => setConfirmation("related")}>ลบพร้อมรายการที่เกี่ยวข้องในถังขยะ</Button>}
      </div>
    )}
  </>;
}

export function AdminAccountDialog({ account }: { account?: { id: string; email: string } }): React.ReactNode {
  const [open, setOpen] = useState(false);
  const title = account ? "แก้ไขอีเมล" : "เพิ่มบัญชีแอดมิน";
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant={account ? "outline" : "default"} className="min-h-10">{title}</Button></DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{account ? "ใช้อีเมลใหม่เพื่อเข้าสู่ระบบครั้งถัดไป" : "บัญชีนี้จะมีสิทธิ์ผู้ดูแลระบบ"}</DialogDescription>
      </DialogHeader>
      {open && <AdminAccountForm account={account} onSaved={() => setOpen(false)} />}
    </DialogContent>
  </Dialog>;
}

function AdminAccountForm({ account, onSaved }: { account?: { id: string; email: string }; onSaved: () => void }): React.ReactNode {
  const [state, submit, pending] = useActionState<ActionResult, FormData>(saveAdminAction, idleAction);
  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);
  return <form action={submit} className="space-y-4">
    {account && <input type="hidden" name="id" value={account.id} />}
    <div className="space-y-1">
      <Label htmlFor="managed-admin-email">อีเมล</Label>
      <Input id="managed-admin-email" name="email" type="email" autoComplete="off" defaultValue={account?.email} required maxLength={254} />
    </div>
    {!account && <div className="space-y-1">
      <Label htmlFor="managed-admin-password">รหัสผ่าน</Label>
      <Input id="managed-admin-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required />
      <p className="text-xs text-muted">อย่างน้อย 12 ตัวอักษร</p>
    </div>}
    {state.message && !state.ok && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
    <DialogFooter><Button type="submit" disabled={pending}>{pending ? "กำลังบันทึก…" : "บันทึกบัญชี"}</Button></DialogFooter>
  </form>;
}
