"use client";

import { useActionState, useEffect } from "react";
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

function Body({ account, onClose, onSaved }: { account: KioskAccountRow | null; onClose: () => void; onSaved: () => void }): React.ReactNode {
  const [state, formAction, pending] = useActionState(saveKioskAccountAction, idleAction);
  const isEdit = account !== null;

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  return (
    <form action={formAction}>
      <DialogTitle id="kiosk-account-title" sx={{ fontWeight: 700, color: "var(--ink-strong)" }}>
        {isEdit ? "แก้ไขบัญชีจุดสแกน" : "เพิ่มบัญชีจุดสแกน"}
      </DialogTitle>
      <DialogContent>
        {account && <input type="hidden" name="id" value={account.id} />}
        {state.message && !state.ok && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: "var(--radius-sm)" }}>
            {state.message}
          </Alert>
        )}
        <div className="flex flex-col gap-4 pt-1">
          <TextField
            name="email"
            label="อีเมล"
            type="email"
            defaultValue={account?.email ?? ""}
            required
            fullWidth
            autoFocus
            disabled={pending}
            error={Boolean(state.fieldErrors?.email)}
            helperText={state.fieldErrors?.email}
            placeholder="เช่น kiosk-gate1@chumko.ac.th"
          />
          {isEdit ? (
            <FormControlLabel
              control={<Switch name="isActive" defaultChecked={account.isActive} disabled={pending} />}
              label="เปิดใช้งานบัญชีนี้"
            />
          ) : (
            <TextField
              name="password"
              label="รหัสผ่าน"
              type="password"
              required
              fullWidth
              disabled={pending}
              error={Boolean(state.fieldErrors?.password)}
              helperText={state.fieldErrors?.password ?? "อย่างน้อย 8 ตัวอักษร"}
              autoComplete="new-password"
            />
          )}
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={pending} variant="text">
          ยกเลิก
        </Button>
        <Button type="submit" disabled={pending} variant="contained">
          {pending ? "กำลังบันทึก…" : isEdit ? "บันทึก" : "เพิ่มบัญชี"}
        </Button>
      </DialogActions>
    </form>
  );
}
