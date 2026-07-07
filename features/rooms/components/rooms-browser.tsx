"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Icon from "@/features/dashboard/components/icon";
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
  const [toast, setToast] = useState<{ severity: "success" | "error"; message: string } | null>(null);

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
    setToast({ severity: "success", message: editing ? "บันทึกการแก้ไขเรียบร้อย" : "เพิ่มห้องเรียบร้อย" });
    router.refresh();
  }
  function confirmDelete(): void {
    if (!deleting) return;
    startDelete(async () => {
      const result = await deleteRoomAction(deleting.id);
      setToast({ severity: result.ok ? "success" : "error", message: result.message ?? (result.ok ? "ลบเรียบร้อย" : "ลบไม่สำเร็จ") });
      setDeleting(null);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-[16px]" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[14px] font-bold text-ink-strong">ห้องและสถานที่ทั้งหมด</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-[10px] px-3 py-2 sm:w-56" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--line)" }}>
            <Icon name="search" sx={{ fontSize: 18, color: "var(--faint)" }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหารหัส ชื่อ หรืออาคาร…" aria-label="ค้นหาห้อง" className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-faint" />
          </div>
          <Button variant="contained" onClick={openCreate} startIcon={<Icon name="add" sx={{ fontSize: 18 }} />}>
            เพิ่มห้อง
          </Button>
        </div>
      </div>

      {results.length > 0 ? (
        <div className="overflow-x-auto" style={{ borderTop: "1px solid var(--line)" }}>
          <Table sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell>รหัสห้อง</TableCell>
                <TableCell>ชื่อห้อง</TableCell>
                <TableCell>อาคาร</TableCell>
                <TableCell>ความจุ</TableCell>
                <TableCell>ใช้สอน</TableCell>
                <TableCell align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((r) => (
                <TableRow key={r.id} sx={{ "&:last-child td": { borderBottom: 0 }, "&:hover": { backgroundColor: "var(--surface-2)" }, transition: "background-color 120ms ease" }}>
                  <TableCell>
                    <span className="tabular inline-flex items-center rounded-md px-2 py-1 text-[12.5px] font-semibold" style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand-ink)" }}>
                      {r.code}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[14px] text-ink-strong">{r.name ?? "—"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[13.5px] text-muted">{r.building ?? "—"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="tabular text-[13.5px] text-ink">{r.capacity ?? "—"}</span>
                  </TableCell>
                  <TableCell>
                    {r.offeringCount > 0 ? <span className="tabular text-[13.5px] text-ink">{r.offeringCount} วิชา</span> : <span className="text-[13px] text-faint">ว่าง</span>}
                  </TableCell>
                  <TableCell align="right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Tooltip title="แก้ไข" arrow>
                        <IconButton size="small" aria-label={`แก้ไข ${r.code}`} onClick={() => openEdit(r)}>
                          <Icon name="edit" sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="ลบ" arrow>
                        <IconButton size="small" aria-label={`ลบ ${r.code}`} onClick={() => setDeleting(r)}>
                          <Icon name="delete" sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center" style={{ borderTop: "1px solid var(--line)" }}>
          <span className="grid size-12 place-items-center rounded-full" style={{ backgroundColor: "var(--surface-2)", color: "var(--faint)" }} aria-hidden="true">
            <Icon name="place" sx={{ fontSize: 24 }} />
          </span>
          <p className="text-[15px] font-semibold text-ink-strong">{rooms.length === 0 ? "ยังไม่มีห้อง เริ่มด้วยการเพิ่มห้องแรก" : "ไม่พบห้องที่ค้นหา"}</p>
        </div>
      )}

      <div className="flex items-center justify-between px-5 py-3 text-[13px] text-muted" style={{ borderTop: "1px solid var(--line)", backgroundColor: "var(--surface)" }}>
        <span className="tabular">แสดง {results.length} จาก {rooms.length} ห้อง</span>
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

      <Snackbar open={toast !== null} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: "var(--radius-sm)" }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </div>
  );
}
