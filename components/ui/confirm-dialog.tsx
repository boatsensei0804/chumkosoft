"use client";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Reusable confirmation dialog for irreversible-feeling actions (e.g. delete). */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "ยืนยัน",
  cancelLabel = "ยกเลิก",
  destructive = false,
  pending = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps): React.ReactNode {
  return (
    <Dialog
      open={open}
      onClose={pending ? undefined : onClose}
      slotProps={{ paper: { sx: { borderRadius: "var(--radius-lg)", maxWidth: 420 } } }}
      aria-labelledby="confirm-dialog-title"
    >
      <DialogTitle id="confirm-dialog-title" sx={{ fontWeight: 700, color: "var(--ink-strong)" }}>
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: "var(--muted)", fontSize: 14 }}>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={pending} variant="text">
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={pending}
          variant="contained"
          sx={
            destructive
              ? {
                  backgroundImage: "none",
                  backgroundColor: "var(--danger)",
                  "&:hover": { backgroundColor: "oklch(0.5 0.19 25)" },
                }
              : undefined
          }
        >
          {pending ? "กำลังดำเนินการ…" : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
