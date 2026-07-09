"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetKioskPasswordAction } from "@/features/kiosk/actions";

interface ResetPasswordDialogProps {
  open: boolean;
  accountId: string;
  accountEmail: string;
  onClose: () => void;
  onDone: (result: { ok: boolean; message?: string }) => void;
}

export default function ResetPasswordDialog({ open, accountId, accountEmail, onClose, onDone }: ResetPasswordDialogProps): React.ReactNode {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(): void {
    setError(null);
    startTransition(async () => {
      const result = await resetKioskPasswordAction(accountId, password);
      if (result.ok) {
        setPassword("");
        onDone(result);
      } else {
        setError(result.message ?? "ตั้งรหัสผ่านไม่สำเร็จ");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ตั้งรหัสผ่านใหม่</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">บัญชี: {accountEmail}</p>
        {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="flex flex-col gap-2 py-1">
          <Label htmlFor="reset-pw">รหัสผ่านใหม่</Label>
          <Input
            id="reset-pw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
            autoFocus
            autoComplete="new-password"
          />
          <p className="text-xs text-muted-foreground">อย่างน้อย 8 ตัวอักษร</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending} type="button">
            ยกเลิก
          </Button>
          <Button onClick={submit} disabled={pending || password.length < 8} type="button">
            {pending ? "กำลังบันทึก…" : "ตั้งรหัสผ่าน"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
