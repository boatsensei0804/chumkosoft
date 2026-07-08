"use client";

import { useState, useTransition } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: "var(--radius-lg)" } } }} aria-labelledby="kiosk-account-title">
      {open && <Body key={account?.id ?? "new"} account={account} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  );
}

/**
 * Uses useTransition + a direct action call (like ResetPasswordDialog) rather than
 * a <form action>/useActionState submit: on this page the form-POST variant could
 * race the action's revalidation and leave the dialog stuck on "กำลังบันทึก…", so
 * we invoke the Server Action as a plain RPC and drive the pending/error UI here.
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
      <DialogTitle id="kiosk-account-title" sx={{ fontWeight: 700, color: "var(--ink-strong)" }}>
        {isEdit ? "แก้ไขบัญชีจุดสแกน" : "เพิ่มบัญชีจุดสแกน"}
      </DialogTitle>
      <DialogContent>
        {message && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: "var(--radius-sm)" }}>
            {message}
          </Alert>
        )}
        <div className="flex flex-col gap-4 pt-1">
          <TextField
            label="อีเมล"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            autoFocus
            disabled={pending}
            error={Boolean(fieldErrors.email)}
            helperText={fieldErrors.email}
            placeholder="เช่น kiosk-gate1@chumko.ac.th"
          />
          {isEdit ? (
            <FormControlLabel
              control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={pending} />}
              label="เปิดใช้งานบัญชีนี้"
            />
          ) : (
            <TextField
              label="รหัสผ่าน"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              disabled={pending}
              error={Boolean(fieldErrors.password)}
              helperText={fieldErrors.password ?? "อย่างน้อย 8 ตัวอักษร"}
              autoComplete="new-password"
            />
          )}
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={pending} variant="text">
          ยกเลิก
        </Button>
        <Button onClick={submit} disabled={pending} variant="contained">
          {pending ? "กำลังบันทึก…" : isEdit ? "บันทึก" : "เพิ่มบัญชี"}
        </Button>
      </DialogActions>
    </>
  );
}
