"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { saveKioskAccountAction } from "@/features/kiosk/actions";
import { idleAction } from "@/types/form";
import type { KioskAccountRow } from "@/features/kiosk/types";

interface KioskAccountDialogProps {
  open: boolean;
  account: KioskAccountRow | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function KioskAccountDialog({ open, account, onClose, onSaved }: KioskAccountDialogProps): React.ReactNode {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        {open && <Body key={account?.id ?? "new"} account={account} onClose={onClose} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Invokes the Server Action directly via useTransition (not a <form action>/
 * useActionState submit) — on this page the form-POST variant could race the
 * action's revalidation and leave the dialog stuck on "กำลังบันทึก…".
 */
function Body({ account, onClose, onSaved }: { account: KioskAccountRow | null; onClose: () => void; onSaved: () => void }): React.ReactNode {
  const isEdit = account !== null;
  const [email, setEmail] = useState(account?.email ?? "");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(account?.isActive ?? true);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function submit(): void {
    setMessage(null);
    setFieldErrors({});
    const fd = new FormData();
    if (account) fd.set("id", account.id);
    fd.set("email", email);
    if (isEdit) {
      if (isActive) fd.set("isActive", "on");
    } else {
      fd.set("password", password);
    }
    startTransition(async () => {
      const result = await saveKioskAccountAction(idleAction, fd);
      if (result.ok) {
        onSaved();
      } else {
        setMessage(result.message ?? null);
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "แก้ไขบัญชีจุดสแกน" : "เพิ่มบัญชีจุดสแกน"}</DialogTitle>
      </DialogHeader>

      {message && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p>}

      <div className="flex flex-col gap-4 py-1">
        <div className="flex flex-col gap-2">
          <Label htmlFor="kiosk-email">อีเมล</Label>
          <Input
            id="kiosk-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            autoFocus
            placeholder="เช่น kiosk-gate1@chumko.ac.th"
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
        </div>

        {isEdit ? (
          <div className="flex items-center justify-between rounded-md border border-line px-3 py-2.5">
            <Label htmlFor="kiosk-active" className="cursor-pointer">
              เปิดใช้งานบัญชีนี้
            </Label>
            <Switch id="kiosk-active" checked={isActive} onCheckedChange={setIsActive} disabled={pending} />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="kiosk-password">รหัสผ่าน</Label>
            <Input
              id="kiosk-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
              autoComplete="new-password"
              aria-invalid={Boolean(fieldErrors.password)}
            />
            <p className="text-xs text-muted-foreground">{fieldErrors.password ?? "อย่างน้อย 8 ตัวอักษร"}</p>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={pending} type="button">
          ยกเลิก
        </Button>
        <Button onClick={submit} disabled={pending} type="button">
          {pending ? "กำลังบันทึก…" : isEdit ? "บันทึก" : "เพิ่มบัญชี"}
        </Button>
      </DialogFooter>
    </>
  );
}
