"use client";

import { useActionState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        {open && <Body key={room?.id ?? "new"} room={room} onClose={onClose} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}

function Body({ room, onClose, onSaved }: { room: RoomRow | null; onClose: () => void; onSaved: () => void }): React.ReactNode {
  const [state, formAction, pending] = useActionState(saveRoomAction, idleAction);
  const isEdit = room !== null;
  const err = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  return (
    <form action={formAction}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "แก้ไขห้อง" : "เพิ่มห้อง"}</DialogTitle>
      </DialogHeader>

      {room && <input type="hidden" name="id" value={room.id} />}

      {state.message && !state.ok && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.message}</p>
      )}

      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="room-code">รหัสห้อง</Label>
          <Input id="room-code" name="code" defaultValue={room?.code ?? ""} required autoFocus disabled={pending} aria-invalid={Boolean(err.code)} placeholder="เช่น 304, LAB2" />
          {err.code && <p className="text-xs text-destructive">{err.code}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="room-name">ชื่อห้อง</Label>
          <Input id="room-name" name="name" defaultValue={room?.name ?? ""} disabled={pending} aria-invalid={Boolean(err.name)} placeholder="เช่น ห้องปฏิบัติการ 2" />
          {err.name && <p className="text-xs text-destructive">{err.name}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="room-building">อาคาร</Label>
            <Input id="room-building" name="building" defaultValue={room?.building ?? ""} disabled={pending} aria-invalid={Boolean(err.building)} placeholder="อาคาร 3" />
            {err.building && <p className="text-xs text-destructive">{err.building}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="room-capacity">ความจุ</Label>
            <Input id="room-capacity" name="capacity" type="number" min={0} max={1000} defaultValue={room?.capacity ?? ""} disabled={pending} aria-invalid={Boolean(err.capacity)} />
            {err.capacity && <p className="text-xs text-destructive">{err.capacity}</p>}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
          ยกเลิก
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "กำลังบันทึก…" : isEdit ? "บันทึก" : "เพิ่มห้อง"}
        </Button>
      </DialogFooter>
    </form>
  );
}
