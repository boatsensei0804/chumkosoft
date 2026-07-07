"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import ClassroomFormDialog from "./classroom-form-dialog";
import { deleteClassroomAction } from "@/features/classrooms/actions";
import type { ClassroomRow, TeacherOption } from "../types";

interface ClassroomsBrowserProps {
  classrooms: ClassroomRow[];
  teachers: TeacherOption[];
}

export default function ClassroomsBrowser({ classrooms, teachers }: ClassroomsBrowserProps): React.ReactNode {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClassroomRow | null>(null);
  const [deleting, setDeleting] = useState<ClassroomRow | null>(null);
  const [isDeletePending, startDelete] = useTransition();
  const [toast, setToast] = useState<{ severity: "success" | "error"; message: string } | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return classrooms;
    return classrooms.filter(
      (c) => c.code.toLowerCase().includes(q) || c.gradeLevel.toLowerCase().includes(q) || (c.homeroomTeacher ?? "").toLowerCase().includes(q),
    );
  }, [classrooms, query]);

  function openCreate(): void {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(c: ClassroomRow): void {
    setEditing(c);
    setDialogOpen(true);
  }

  function handleSaved(): void {
    setDialogOpen(false);
    setToast({ severity: "success", message: editing ? "บันทึกการแก้ไขเรียบร้อย" : "เพิ่มห้องเรียนเรียบร้อย" });
    router.refresh();
  }

  function confirmDelete(): void {
    if (!deleting) return;
    startDelete(async () => {
      const result = await deleteClassroomAction(deleting.id);
      setToast({ severity: result.ok ? "success" : "error", message: result.message ?? (result.ok ? "ลบเรียบร้อย" : "ลบไม่สำเร็จ") });
      setDeleting(null);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-[16px]" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[14px] font-bold text-ink-strong">ห้องเรียนทั้งหมด · ปีการศึกษาปัจจุบัน</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-[10px] px-3 py-2 sm:w-56" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--line)" }}>
            <Icon name="search" sx={{ fontSize: 18, color: "var(--faint)" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาห้อง ระดับชั้น หรือครูที่ปรึกษา…"
              aria-label="ค้นหาห้องเรียน"
              className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
            />
          </div>
          <Button variant="contained" onClick={openCreate} startIcon={<Icon name="add" sx={{ fontSize: 18 }} />}>
            เพิ่มห้องเรียน
          </Button>
        </div>
      </div>

      {results.length > 0 ? (
        <div className="overflow-x-auto" style={{ borderTop: "1px solid var(--line)" }}>
          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell>ห้องเรียน</TableCell>
                <TableCell>ครูที่ปรึกษา</TableCell>
                <TableCell>นักเรียน</TableCell>
                <TableCell>รายวิชา</TableCell>
                <TableCell align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((c) => (
                <TableRow key={c.id} sx={{ "&:last-child td": { borderBottom: 0 }, "&:hover": { backgroundColor: "var(--surface-2)" }, transition: "background-color 120ms ease" }}>
                  <TableCell>
                    <Link href={`/dashboard/classrooms/${c.id}`} className="flex items-center gap-3 group">
                      <span className="grid size-9 place-items-center rounded-[10px]" style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand-ink)" }}>
                        <Icon name="groups" sx={{ fontSize: 19 }} />
                      </span>
                      <span>
                        <span className="block text-[14px] font-semibold text-ink-strong group-hover:text-brand-ink">{c.code}</span>
                        <span className="block text-[12.5px] text-muted">{c.gradeLevel}</span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {c.homeroomTeacher ? (
                      <span className="text-[13.5px] text-ink">{c.homeroomTeacher}</span>
                    ) : (
                      <span className="text-[13px] text-faint">ยังไม่กำหนด</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="tabular text-[13.5px] text-ink">{c.studentCount}</span>
                    <span className="text-[12.5px] text-muted"> คน</span>
                  </TableCell>
                  <TableCell>
                    <span className="tabular text-[13.5px] text-ink">{c.offeringCount}</span>
                    <span className="text-[12.5px] text-muted"> วิชา</span>
                  </TableCell>
                  <TableCell align="right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Tooltip title="รายละเอียด" arrow>
                        <IconButton size="small" component={Link} href={`/dashboard/classrooms/${c.id}`} aria-label={`รายละเอียด ${c.code}`}>
                          <Icon name="arrow_forward" sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="แก้ไข" arrow>
                        <IconButton size="small" aria-label={`แก้ไข ${c.code}`} onClick={() => openEdit(c)}>
                          <Icon name="edit" sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="ลบ" arrow>
                        <IconButton size="small" aria-label={`ลบ ${c.code}`} onClick={() => setDeleting(c)}>
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
            <Icon name="groups" sx={{ fontSize: 24 }} />
          </span>
          <p className="text-[15px] font-semibold text-ink-strong">
            {classrooms.length === 0 ? "ยังไม่มีห้องเรียนในปีการศึกษานี้ เริ่มด้วยการเพิ่มห้องแรก" : "ไม่พบห้องเรียนที่ค้นหา"}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between px-5 py-3 text-[13px] text-muted" style={{ borderTop: "1px solid var(--line)", backgroundColor: "var(--surface)" }}>
        <span className="tabular">แสดง {results.length} จาก {classrooms.length} ห้อง</span>
      </div>

      <ClassroomFormDialog open={dialogOpen} classroom={editing} teachers={teachers} onClose={() => setDialogOpen(false)} onSaved={handleSaved} />

      <ConfirmDialog
        open={deleting !== null}
        title="ลบห้องเรียน"
        message={deleting ? `ต้องการลบห้อง “${deleting.code}” ใช่หรือไม่? ข้อมูลจะถูกซ่อนแต่ยังเก็บประวัติไว้` : ""}
        confirmLabel="ลบห้องเรียน"
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
