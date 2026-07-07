"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Icon from "./icon";
import StatusChip from "./status-chip";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import PaginationBar from "@/components/ui/pagination-bar";
import StudentFormDialog from "@/features/students/components/student-form-dialog";
import { deleteStudentAction, deleteStudentsAction } from "@/features/students/actions";
import { useListParams } from "@/features/dashboard/hooks/use-list-params";
import type { EnrolmentStatus, StudentSummary, ClassroomOption } from "../types";
import type { Paginated } from "@/types/pagination";

type Filter = "all" | EnrolmentStatus;

interface StudentsBrowserProps {
  page: Paginated<StudentSummary>;
  query: string;
  filter: Filter;
  classrooms: ClassroomOption[];
}

const filters: { key: Filter; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "active", label: "กำลังศึกษา" },
  { key: "pending", label: "รออนุมัติ" },
  { key: "leave", label: "ลาพัก" },
];

export default function StudentsBrowser({ page, query, filter, classrooms }: StudentsBrowserProps): React.ReactNode {
  const router = useRouter();
  const { navigate, isPending } = useListParams("/dashboard/students", { q: query, page: page.page, filter });
  const [search, setSearch] = useState(query);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StudentSummary | null>(null);
  const [deleting, setDeleting] = useState<StudentSummary | null>(null);
  const [isDeletePending, startDelete] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [isBulkPending, startBulk] = useTransition();
  const [toast, setToast] = useState<{ severity: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (search === query) return;
    const t = setTimeout(() => navigate({ q: search, page: 1 }), 350);
    return () => clearTimeout(t);
  }, [search, query, navigate]);

  const students = page.rows;

  // Selection lives by id; ids no longer on the current page are simply ignored,
  // so paging/filtering never needs a selection-reset effect.
  const selectedOnPage = students.filter((s) => selected.has(s.id)).map((s) => s.id);
  const allSelected = students.length > 0 && selectedOnPage.length === students.length;
  const someSelected = selectedOnPage.length > 0 && !allSelected;

  function toggleAll(): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) students.forEach((s) => next.delete(s.id));
      else students.forEach((s) => next.add(s.id));
      return next;
    });
  }

  function toggleOne(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirmBulkDelete(): void {
    const ids = selectedOnPage;
    startBulk(async () => {
      const result = await deleteStudentsAction(ids);
      setToast({ severity: result.ok ? "success" : "error", message: result.message ?? (result.ok ? "ลบเรียบร้อย" : "ลบไม่สำเร็จ") });
      setBulkOpen(false);
      if (result.ok) {
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  function openCreate(): void {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(s: StudentSummary): void {
    setEditing(s);
    setDialogOpen(true);
  }

  function handleSaved(): void {
    setDialogOpen(false);
    setToast({ severity: "success", message: editing ? "บันทึกการแก้ไขเรียบร้อย" : "เพิ่มนักเรียนเรียบร้อย" });
    router.refresh();
  }

  function confirmDelete(): void {
    if (!deleting) return;
    startDelete(async () => {
      const result = await deleteStudentAction(deleting.id);
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
        <div role="tablist" aria-label="กรองตามสถานะ" className="flex flex-wrap items-center gap-1">
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                role="tab"
                aria-selected={active}
                onClick={() => navigate({ filter: f.key, page: 1 })}
                className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[13px] font-semibold transition-colors"
                style={{ backgroundColor: active ? "var(--blue)" : "var(--surface-2)", color: active ? "var(--band-ink)" : "var(--muted)" }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-[10px] px-3 py-2 sm:w-56" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--line)" }}>
            <Icon name="search" sx={{ fontSize: 18, color: "var(--faint)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ หรือรหัส…"
              aria-label="ค้นหานักเรียน"
              className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
            />
          </div>
          <Button variant="contained" onClick={openCreate} startIcon={<Icon name="add" sx={{ fontSize: 18 }} />}>
            เพิ่มนักเรียน
          </Button>
        </div>
      </div>

      {selectedOnPage.length > 0 && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-2.5"
          style={{ backgroundColor: "var(--brand-soft)", borderTop: "1px solid var(--line)" }}
        >
          <span className="text-[13.5px] font-semibold" style={{ color: "var(--brand-ink)" }}>
            เลือกแล้ว {selectedOnPage.length} คน
          </span>
          <div className="flex items-center gap-1">
            <Button size="small" variant="text" onClick={() => setSelected(new Set())}>
              ล้างการเลือก
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => setBulkOpen(true)}
              startIcon={<Icon name="delete" sx={{ fontSize: 17 }} />}
              sx={{
                backgroundImage: "none",
                backgroundColor: "var(--danger)",
                boxShadow: "none",
                "&:hover": { backgroundImage: "none", backgroundColor: "var(--danger)", filter: "brightness(0.94)" },
              }}
            >
              ลบที่เลือก
            </Button>
          </div>
        </div>
      )}

      {students.length > 0 ? (
        <div className="overflow-x-auto" style={{ borderTop: "1px solid var(--line)", opacity: isPending ? 0.6 : 1, transition: "opacity 120ms ease" }}>
          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleAll}
                    slotProps={{ input: { "aria-label": "เลือกนักเรียนทั้งหมดในหน้านี้" } }}
                    size="small"
                  />
                </TableCell>
                <TableCell>นักเรียน</TableCell>
                <TableCell>ชั้นเรียน</TableCell>
                <TableCell>ระดับ</TableCell>
                <TableCell>วันที่ลงทะเบียน</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((s) => {
                const isSelected = selected.has(s.id);
                return (
                <TableRow
                  key={s.id}
                  selected={isSelected}
                  sx={{
                    "&:last-child td": { borderBottom: 0 },
                    "&:hover": { backgroundColor: "var(--surface-2)" },
                    "&.Mui-selected, &.Mui-selected:hover": { backgroundColor: "var(--brand-soft)" },
                    transition: "background-color 120ms ease",
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleOne(s.id)}
                      slotProps={{ input: { "aria-label": `เลือก ${s.firstName} ${s.lastName}` } }}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar sx={{ width: 36, height: 36, bgcolor: "var(--brand-soft)", color: "var(--brand-ink)", fontSize: 14 }}>
                        {s.firstName.charAt(0)}
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-ink-strong">
                          {[s.prefix, `${s.firstName} ${s.lastName}`].filter(Boolean).join(" ")}
                        </p>
                        <p className="tabular text-[12.5px] text-muted">รหัส {s.code}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[14px] font-medium text-ink">{s.classroom}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[13.5px] text-muted">{s.grade}</span>
                  </TableCell>
                  <TableCell>
                    <span className="tabular text-[13.5px] text-muted">{s.enrolledAt}</span>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={s.status} />
                  </TableCell>
                  <TableCell align="right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Tooltip title="แก้ไข" arrow>
                        <IconButton size="small" aria-label={`แก้ไข ${s.firstName} ${s.lastName}`} onClick={() => openEdit(s)}>
                          <Icon name="edit" sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="ลบ" arrow>
                        <IconButton size="small" aria-label={`ลบ ${s.firstName} ${s.lastName}`} onClick={() => setDeleting(s)}>
                          <Icon name="delete" sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center" style={{ borderTop: "1px solid var(--line)" }}>
          <span className="grid size-12 place-items-center rounded-full" style={{ backgroundColor: "var(--surface-2)", color: "var(--faint)" }} aria-hidden="true">
            <Icon name="search" sx={{ fontSize: 24 }} />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-ink-strong">
              {query || filter !== "all" ? "ไม่พบนักเรียนที่ตรงกับเงื่อนไข" : "ยังไม่มีนักเรียน เริ่มด้วยการเพิ่มนักเรียนคนแรก"}
            </p>
            <p className="mt-1 text-[13.5px] text-muted">ลองปรับคำค้นหา หรือเลือกสถานะอื่น</p>
          </div>
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

      <StudentFormDialog open={dialogOpen} student={editing} classrooms={classrooms} onClose={() => setDialogOpen(false)} onSaved={handleSaved} />

      <ConfirmDialog
        open={deleting !== null}
        title="ลบนักเรียน"
        message={deleting ? `ต้องการลบ “${deleting.firstName} ${deleting.lastName}” (รหัส ${deleting.code}) ใช่หรือไม่? ข้อมูลจะถูกซ่อนแต่ยังเก็บประวัติไว้` : ""}
        confirmLabel="ลบนักเรียน"
        destructive
        pending={isDeletePending}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={bulkOpen}
        title="ลบนักเรียนที่เลือก"
        message={`ต้องการลบนักเรียน ${selectedOnPage.length} คนที่เลือกใช่หรือไม่? ข้อมูลจะถูกซ่อนแต่ยังเก็บประวัติไว้`}
        confirmLabel={`ลบ ${selectedOnPage.length} คน`}
        destructive
        pending={isBulkPending}
        onConfirm={confirmBulkDelete}
        onClose={() => setBulkOpen(false)}
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
