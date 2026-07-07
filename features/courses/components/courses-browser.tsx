"use client";

import { useEffect, useState, useTransition } from "react";
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
import PaginationBar from "@/components/ui/pagination-bar";
import CourseFormDialog from "./course-form-dialog";
import { deleteCourseAction } from "@/features/courses/actions";
import { useListParams } from "@/features/dashboard/hooks/use-list-params";
import type { CourseSummary } from "../types";
import type { Paginated } from "@/types/pagination";

interface CoursesBrowserProps {
  page: Paginated<CourseSummary>;
  query: string;
}

export default function CoursesBrowser({ page, query }: CoursesBrowserProps): React.ReactNode {
  const router = useRouter();
  const { navigate, isPending } = useListParams("/dashboard/courses", { q: query, page: page.page });
  const [search, setSearch] = useState(query);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CourseSummary | null>(null);
  const [deleting, setDeleting] = useState<CourseSummary | null>(null);
  const [isDeletePending, startDelete] = useTransition();
  const [toast, setToast] = useState<{ severity: "success" | "error"; message: string } | null>(null);

  // Debounced live search → URL (server refetch).
  useEffect(() => {
    if (search === query) return;
    const t = setTimeout(() => navigate({ q: search, page: 1 }), 350);
    return () => clearTimeout(t);
  }, [search, query, navigate]);

  const courses = page.rows;

  function openCreate(): void {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(course: CourseSummary): void {
    setEditing(course);
    setDialogOpen(true);
  }

  function handleSaved(): void {
    setDialogOpen(false);
    setToast({ severity: "success", message: editing ? "บันทึกการแก้ไขเรียบร้อย" : "เพิ่มรายวิชาเรียบร้อย" });
    router.refresh();
  }

  function confirmDelete(): void {
    if (!deleting) return;
    startDelete(async () => {
      const result = await deleteCourseAction(deleting.id);
      setToast({ severity: result.ok ? "success" : "error", message: result.message ?? (result.ok ? "ลบเรียบร้อย" : "ลบไม่สำเร็จ") });
      setDeleting(null);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div
      className="flex flex-col overflow-hidden rounded-[16px]"
      style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[14px] font-bold text-ink-strong">รายวิชาทั้งหมด</h2>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-2 rounded-[10px] px-3 py-2 sm:w-56"
            style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--line)" }}
          >
            <Icon name="search" sx={{ fontSize: 18, color: "var(--faint)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหารหัสหรือชื่อวิชา…"
              aria-label="ค้นหารายวิชา"
              className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
            />
          </div>
          <Button variant="contained" onClick={openCreate} startIcon={<Icon name="add" sx={{ fontSize: 18 }} />}>
            เพิ่มรายวิชา
          </Button>
        </div>
      </div>

      {courses.length > 0 ? (
        <div className="overflow-x-auto" style={{ borderTop: "1px solid var(--line)", opacity: isPending ? 0.6 : 1, transition: "opacity 120ms ease" }}>
          <Table sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell>รหัสวิชา</TableCell>
                <TableCell>ชื่อรายวิชา</TableCell>
                <TableCell>หน่วยกิต</TableCell>
                <TableCell>เปิดสอน</TableCell>
                <TableCell align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {courses.map((c) => (
                <TableRow
                  key={c.id}
                  sx={{ "&:last-child td": { borderBottom: 0 }, "&:hover": { backgroundColor: "var(--surface-2)" }, transition: "background-color 120ms ease" }}
                >
                  <TableCell>
                    <span className="tabular inline-flex items-center rounded-md px-2 py-1 text-[12.5px] font-semibold" style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand-ink)" }}>
                      {c.code}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[14px] font-semibold text-ink-strong">{c.name}</span>
                  </TableCell>
                  <TableCell>
                    <span className="tabular text-[13.5px] text-ink">{c.credits ?? "—"}</span>
                  </TableCell>
                  <TableCell>
                    {c.offeringsCount > 0 ? (
                      <span className="tabular text-[13.5px] text-ink">{c.offeringsCount} ห้อง</span>
                    ) : (
                      <span className="text-[13px] text-faint">ยังไม่เปิด</span>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Tooltip title="แก้ไข" arrow>
                        <IconButton size="small" aria-label={`แก้ไข ${c.name}`} onClick={() => openEdit(c)}>
                          <Icon name="edit" sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="ลบ" arrow>
                        <IconButton size="small" aria-label={`ลบ ${c.name}`} onClick={() => setDeleting(c)}>
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
            <Icon name="search" sx={{ fontSize: 24 }} />
          </span>
          <p className="text-[15px] font-semibold text-ink-strong">
            {query ? "ไม่พบรายวิชาที่ค้นหา" : "ยังไม่มีรายวิชา เริ่มด้วยการเพิ่มรายวิชาแรก"}
          </p>
        </div>
      )}

      <PaginationBar
        page={page.page}
        pageCount={page.pageCount}
        total={page.total}
        pageSize={page.pageSize}
        disabled={isPending}
        onPageChange={(p) => navigate({ page: p })}
      />

      <CourseFormDialog open={dialogOpen} course={editing} onClose={() => setDialogOpen(false)} onSaved={handleSaved} />

      <ConfirmDialog
        open={deleting !== null}
        title="ลบรายวิชา"
        message={deleting ? `ต้องการลบ “${deleting.name}” (${deleting.code}) ใช่หรือไม่? ข้อมูลจะถูกซ่อนแต่ยังเก็บประวัติไว้` : ""}
        confirmLabel="ลบรายวิชา"
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
