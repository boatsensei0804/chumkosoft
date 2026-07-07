"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Icon from "@/features/dashboard/components/icon";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import PaginationBar from "@/components/ui/pagination-bar";
import StaffFormDialog from "./staff-form-dialog";
import { deleteStaffAction } from "@/features/teachers/actions";
import { useListParams } from "@/features/dashboard/hooks/use-list-params";
import type { StaffKind, StaffSummary } from "../types";
import type { StaffFilter } from "@/repositories/staff-repository";
import type { Paginated } from "@/types/pagination";

const filters: { key: StaffFilter; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "TEACHER", label: "ครูผู้สอน" },
  { key: "STAFF", label: "บุคลากร" },
];

const kindStyle: Record<StaffKind, { label: string; bg: string; fg: string }> = {
  TEACHER: { label: "ครูผู้สอน", bg: "var(--brand-soft)", fg: "var(--brand-ink)" },
  PERSONNEL: { label: "บุคลากร", bg: "var(--surface-sunken)", fg: "var(--muted)" },
  ADMIN: { label: "ผู้ดูแลระบบ", bg: "var(--warning-soft)", fg: "oklch(0.5 0.12 55)" },
};

const tints = [
  { bg: "var(--brand-soft)", fg: "var(--brand-ink)" },
  { bg: "var(--success-soft)", fg: "oklch(0.42 0.1 152)" },
  { bg: "oklch(0.955 0.035 300)", fg: "oklch(0.44 0.14 300)" },
];

function tintFor(id: string): { bg: string; fg: string } {
  const sum = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return tints[sum % tints.length];
}

interface TeachersBrowserProps {
  page: Paginated<StaffSummary>;
  query: string;
  filter: StaffFilter;
}

export default function TeachersBrowser({ page, query, filter }: TeachersBrowserProps): React.ReactNode {
  const router = useRouter();
  const { navigate, isPending } = useListParams("/dashboard/teachers", { q: query, page: page.page, filter });
  const [search, setSearch] = useState(query);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffSummary | null>(null);
  const [deleting, setDeleting] = useState<StaffSummary | null>(null);
  const [isDeletePending, startDelete] = useTransition();
  const [toast, setToast] = useState<{ severity: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (search === query) return;
    const t = setTimeout(() => navigate({ q: search, page: 1 }), 350);
    return () => clearTimeout(t);
  }, [search, query, navigate]);

  const staff = page.rows;

  function openCreate(): void {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(s: StaffSummary): void {
    setEditing(s);
    setDialogOpen(true);
  }

  function handleSaved(): void {
    setDialogOpen(false);
    setToast({ severity: "success", message: editing ? "บันทึกการแก้ไขเรียบร้อย" : "เพิ่มบุคลากรเรียบร้อย" });
    router.refresh();
  }

  function confirmDelete(): void {
    if (!deleting) return;
    startDelete(async () => {
      const result = await deleteStaffAction(deleting.id);
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
        <div role="tablist" aria-label="กรองตามประเภท" className="flex flex-wrap items-center gap-1">
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
              placeholder="ค้นหาชื่อ รหัส หรือตำแหน่ง…"
              aria-label="ค้นหาครูและบุคลากร"
              className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
            />
          </div>
          <Button variant="contained" onClick={openCreate} startIcon={<Icon name="add" sx={{ fontSize: 18 }} />}>
            เพิ่มบุคลากร
          </Button>
        </div>
      </div>

      {staff.length > 0 ? (
        <div className="overflow-x-auto" style={{ borderTop: "1px solid var(--line)", opacity: isPending ? 0.6 : 1, transition: "opacity 120ms ease" }}>
          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell>ครูและบุคลากร</TableCell>
                <TableCell>ตำแหน่ง</TableCell>
                <TableCell>ประเภท</TableCell>
                <TableCell>วิชาที่สอน</TableCell>
                <TableCell>อีเมล</TableCell>
                <TableCell align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {staff.map((s) => {
                const tint = tintFor(s.id);
                const kind = kindStyle[s.type];
                return (
                  <TableRow key={s.id} sx={{ "&:last-child td": { borderBottom: 0 }, "&:hover": { backgroundColor: "var(--surface-2)" }, transition: "background-color 120ms ease" }}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar sx={{ width: 36, height: 36, bgcolor: tint.bg, color: tint.fg, fontSize: 14 }}>{s.firstName.charAt(0)}</Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-ink-strong">
                            {[s.prefix, `${s.firstName} ${s.lastName}`].filter(Boolean).join(" ")}
                          </p>
                          <p className="tabular text-[12.5px] text-muted">รหัส {s.code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-[13.5px] text-ink">{s.position ?? "—"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ backgroundColor: kind.bg, color: kind.fg }}>
                        {kind.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="tabular text-[13.5px] font-medium text-ink">{s.subjectsCount}</span>
                      <span className="text-[12.5px] text-muted"> วิชา</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[13px] text-muted">{s.email ?? "—"}</span>
                    </TableCell>
                    <TableCell align="right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Tooltip title="ดูข้อมูล" arrow>
                          <IconButton size="small" aria-label={`ดูข้อมูล ${s.firstName} ${s.lastName}`} component={Link} href={`/dashboard/teachers/${s.id}`}>
                            <Icon name="visibility" sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
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
          <p className="text-[15px] font-semibold text-ink-strong">ไม่พบครูหรือบุคลากรที่ตรงกับเงื่อนไข</p>
          <p className="text-[13.5px] text-muted">ลองปรับคำค้นหา หรือเลือกประเภทอื่น</p>
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

      <StaffFormDialog open={dialogOpen} staff={editing} onClose={() => setDialogOpen(false)} onSaved={handleSaved} />

      <ConfirmDialog
        open={deleting !== null}
        title="ลบบุคลากร"
        message={deleting ? `ต้องการลบ “${deleting.firstName} ${deleting.lastName}” (รหัส ${deleting.code}) ใช่หรือไม่? ข้อมูลจะถูกซ่อนแต่ยังเก็บประวัติไว้` : ""}
        confirmLabel="ลบบุคลากร"
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
