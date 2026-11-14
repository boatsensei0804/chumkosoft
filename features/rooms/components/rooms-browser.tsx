"use client";

import RecordActions from "@/features/dashboard/components/record-actions";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Plus, Eye, Pencil, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import RoomFormDialog from "./room-form-dialog";
import MobileRecordCard from "@/features/dashboard/components/mobile-record-card";
import RecordPreviewDialog from "@/features/dashboard/components/record-preview-dialog";
import { deleteRoomAction } from "@/features/rooms/actions";
import type { RoomRow } from "../types";

export default function RoomsBrowser({ rooms }: { rooms: RoomRow[] }): React.ReactNode {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RoomRow | null>(null);
  const [viewing, setViewing] = useState<RoomRow | null>(null);
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
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-line bg-surface-2 px-3 py-2 sm:w-56 sm:flex-none">
              <Search className="size-[18px] text-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหารหัส ชื่อ หรืออาคาร…"
                aria-label="ค้นหาห้อง"
                className="min-w-0 w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
              />
            </div>
            <Button onClick={openCreate}>
              <Plus className="size-4" /> เพิ่มห้อง
            </Button>
          </div>
        </div>

        {results.length > 0 ? (
          <>
          <div className="grid gap-3 border-t border-line p-3 md:hidden">
            {results.map((r) => <MobileRecordCard key={r.id} title={r.name ?? r.code} subtitle={`รหัส ${r.code}`}
              fields={[{ label: "อาคาร", value: r.building ?? "—" }, { label: "ความจุ", value: r.capacity ?? "—" }, { label: "ใช้สอน", value: `${r.offeringCount} วิชา` }]}
              actions={<><Button variant="outline" size="sm" className="min-h-10" onClick={() => setViewing(r)}><Eye className="size-4" /> ดูข้อมูล</Button><Button variant="outline" size="sm" className="min-h-10" onClick={() => openEdit(r)}><Pencil className="size-4" /> แก้ไข</Button><Button variant="ghost" size="sm" className="min-h-10 text-danger" onClick={() => setDeleting(r)}><Trash2 className="size-4" /> ลบ</Button></>}
            />)}
          </div>
          <div className="hidden overflow-x-auto border-t border-line md:block">
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
                    <TableCell className="text-right"><RecordActions name={r.code} onView={() => setViewing(r)} onEdit={() => openEdit(r)} onDelete={() => setDeleting(r)} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          </>
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
        {viewing && <RecordPreviewDialog open title={viewing.name ?? viewing.code} subtitle={`รหัสห้อง ${viewing.code}`} fields={[{ label: "อาคาร", value: viewing.building ?? "—" }, { label: "ความจุ", value: viewing.capacity === null ? "—" : `${viewing.capacity} คน` }, { label: "รายวิชาที่ใช้ห้องนี้", value: `${viewing.offeringCount} วิชา` }]} onClose={() => setViewing(null)} onEdit={() => { const room = viewing; setViewing(null); openEdit(room); }} />}

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
