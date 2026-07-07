"use client";

import { useActionState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { saveRoomAction } from "@/features/rooms/actions";
import { idleAction } from "@/types/form";
import type { RoomRow } from "@/features/rooms/types";

interface RoomFormDialogProps {
  open: boolean;
  room: RoomRow | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function RoomFormDialog({ open, room, onClose, onSaved }: RoomFormDialogProps): React.ReactNode {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: "var(--radius-lg)" } } }} aria-labelledby="room-form-title">
      {open && <Body key={room?.id ?? "new"} room={room} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  );
}

function Body({ room, onClose, onSaved }: { room: RoomRow | null; onClose: () => void; onSaved: () => void }): React.ReactNode {
  const [state, formAction, pending] = useActionState(saveRoomAction, idleAction);
  const isEdit = room !== null;

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  return (
    <form action={formAction}>
      <DialogTitle id="room-form-title" sx={{ fontWeight: 700, color: "var(--ink-strong)" }}>
        {isEdit ? "แก้ไขห้อง" : "เพิ่มห้อง"}
      </DialogTitle>
      <DialogContent>
        {room && <input type="hidden" name="id" value={room.id} />}
        {state.message && !state.ok && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: "var(--radius-sm)" }}>
            {state.message}
          </Alert>
        )}
        <div className="flex flex-col gap-4 pt-1">
          <TextField name="code" label="รหัสห้อง" defaultValue={room?.code ?? ""} required fullWidth autoFocus disabled={pending} error={Boolean(state.fieldErrors?.code)} helperText={state.fieldErrors?.code} placeholder="เช่น 304, LAB2" />
          <TextField name="name" label="ชื่อห้อง" defaultValue={room?.name ?? ""} fullWidth disabled={pending} error={Boolean(state.fieldErrors?.name)} helperText={state.fieldErrors?.name} placeholder="เช่น ห้องปฏิบัติการ 2" />
          <div className="grid grid-cols-2 gap-4">
            <TextField name="building" label="อาคาร" defaultValue={room?.building ?? ""} fullWidth disabled={pending} error={Boolean(state.fieldErrors?.building)} helperText={state.fieldErrors?.building} placeholder="อาคาร 3" />
            <TextField name="capacity" label="ความจุ" type="number" defaultValue={room?.capacity ?? ""} fullWidth disabled={pending} error={Boolean(state.fieldErrors?.capacity)} helperText={state.fieldErrors?.capacity} slotProps={{ htmlInput: { min: 0, max: 1000 } }} />
          </div>
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={pending} variant="text">
          ยกเลิก
        </Button>
        <Button type="submit" disabled={pending} variant="contained">
          {pending ? "กำลังบันทึก…" : isEdit ? "บันทึก" : "เพิ่มห้อง"}
        </Button>
      </DialogActions>
    </form>
  );
}
