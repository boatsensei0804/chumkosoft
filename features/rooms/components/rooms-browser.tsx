"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import RoomFormDialog from "./room-form-dialog";
import { deleteRoomAction } from "@/features/rooms/actions";
import type { RoomRow } from "../types";

export default function RoomsBrowser({ rooms }: { rooms: RoomRow[] }): React.ReactNode {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RoomRow | null>(null);
  const [deleting, setDeleting] = useState<RoomRow | null>(null);
  const [isDeletePending, startDelete] = useTransition();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((r) => r.code.toLowerCase().includes(q) || (r.name ?? "").toLowerCase().includes(q) || (r.building ?? "").toLowerCase().includes(q));
  }, [rooms, query]);

  function openCreate(): void {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(r: RoomRow): void {
    setEditing(r);
    setDialogOpen(true);
  }
  function handleSaved(): void {
    setDialogOpen(false);
    toast.success(editing ? "บันทึกการแก้ไขเรียบร้อย" : "เพิ่มห้องเรียบร้อย");
    router.refresh();
  }
  function confirmDelete(): void {
    if (!deleting) return;
    startDelete(async () => {
      const result = await deleteRoomAction(deleting.id);
      if (result.ok) toast.success(result.message ?? "ลบเรียบร้อย");
      else toast.error(result.message ?? "ลบไม่สำเร็จ");
      setDeleting(null);
      if (result.ok) router.refresh();
    });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[14px] font-bold text-ink-strong">ห้องและสถานที่ทั้งหมด</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-[10px] border border-line bg-surface-2 px-3 py-2 sm:w-56">
              <Search className="size-[18px] text-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหารหัส ชื่อ หรืออาคาร…"
                aria-label="ค้นหาห้อง"
                className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
              />
            </div>
            <Button onClick={openCreate}>
              <Plus className="size-4" /> เพิ่มห้อง
            </Button>
          </div>
        </div>

        {results.length > 0 ? (
          <div className="overflow-x-auto border-t border-line">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>รหัสห้อง</TableHead>
                  <TableHead>ชื่อห้อง</TableHead>
                  <TableHead>อาคาร</TableHead>
                  <TableHead>ความจุ</TableHead>
                  <TableHead>ใช้สอน</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Badge variant="secondary" className="tabular bg-brand-soft text-brand-ink">
                        {r.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[14px] text-ink-strong">{r.name ?? "—"}</TableCell>
                    <TableCell className="text-[13.5px] text-muted">{r.building ?? "—"}</TableCell>
                    <TableCell className="tabular text-[13.5px] text-ink">{r.capacity ?? "—"}</TableCell>
                    <TableCell>
                      {r.offeringCount > 0 ? (
                        <span className="tabular text-[13.5px] text-ink">{r.offeringCount} วิชา</span>
                      ) : (
                        <span className="text-[13px] text-faint">ว่าง</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 text-muted hover:text-ink" aria-label={`แก้ไข ${r.code}`} onClick={() => openEdit(r)}>
                              <Pencil className="size-[18px]" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>แก้ไข</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 text-muted hover:text-ink" aria-label={`ลบ ${r.code}`} onClick={() => setDeleting(r)}>
                              <Trash2 className="size-[18px]" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>ลบ</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 border-t border-line px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-faint" aria-hidden="true">
              <MapPin className="size-6" />
            </span>
            <p className="text-[15px] font-semibold text-ink-strong">{rooms.length === 0 ? "ยังไม่มีห้อง เริ่มด้วยการเพิ่มห้องแรก" : "ไม่พบห้องที่ค้นหา"}</p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-line bg-surface px-5 py-3 text-[13px] text-muted">
          <span className="tabular">
            แสดง {results.length} จาก {rooms.length} ห้อง
          </span>
        </div>

        <RoomFormDialog open={dialogOpen} room={editing} onClose={() => setDialogOpen(false)} onSaved={handleSaved} />

        <ConfirmDialog
          open={deleting !== null}
          title="ลบห้อง"
          message={deleting ? `ต้องการลบห้อง “${deleting.code}” ใช่หรือไม่? ข้อมูลจะถูกซ่อนแต่ยังเก็บประวัติไว้` : ""}
          confirmLabel="ลบห้อง"
          destructive
          pending={isDeletePending}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
        />
      </div>
    </TooltipProvider>
  );
}
