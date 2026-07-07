"use client";

import { useState, useTransition } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: "var(--radius-lg)" } } }} aria-labelledby="reset-pw-title">
      <DialogTitle id="reset-pw-title" sx={{ fontWeight: 700, color: "var(--ink-strong)" }}>
        ตั้งรหัสผ่านใหม่
      </DialogTitle>
      <DialogContent>
        <p className="mb-3 text-[12.5px] text-muted">บัญชี: {accountEmail}</p>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: "var(--radius-sm)" }}>
            {error}
          </Alert>
        )}
        <TextField
          label="รหัสผ่านใหม่"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          fullWidth
          autoFocus
          disabled={pending}
          helperText="อย่างน้อย 8 ตัวอักษร"
          autoComplete="new-password"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={pending} variant="text">
          ยกเลิก
        </Button>
        <Button onClick={submit} disabled={pending || password.length < 8} variant="contained">
          {pending ? "กำลังบันทึก…" : "ตั้งรหัสผ่าน"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
