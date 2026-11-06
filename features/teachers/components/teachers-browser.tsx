"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
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

const kindStyle: Record<StaffKind, { label: string; className: string }> = {
  TEACHER: { label: "ครูผู้สอน", className: "bg-brand-soft text-brand-ink" },
  PERSONNEL: { label: "บุคลากร", className: "bg-surface-sunken text-muted" },
  ADMIN: { label: "ผู้ดูแลระบบ", className: "bg-warning-soft text-[oklch(0.5_0.12_55)]" },
};

interface TeachersBrowserProps {
  page: Paginated<StaffSummary>;
  query: string;
  filter: StaffFilter;
  canManageAccounts: boolean;
}

export default function TeachersBrowser({ page, query, filter, canManageAccounts }: TeachersBrowserProps): React.ReactNode {
  const router = useRouter();
  const { navigate, isPending } = useListParams("/dashboard/teachers", { q: query, page: page.page, filter });
  const [search, setSearch] = useState(query);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffSummary | null>(null);
  const [deleting, setDeleting] = useState<StaffSummary | null>(null);
  const [isDeletePending, startDelete] = useTransition();

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
    toast.success(editing ? "บันทึกการแก้ไขเรียบร้อย" : "เพิ่มบุคลากรเรียบร้อย");
    router.refresh();
  }

  function confirmDelete(): void {
    if (!deleting) return;
    startDelete(async () => {
      const result = await deleteStaffAction(deleting.id);
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
          <div role="tablist" aria-label="กรองตามประเภท" className="flex flex-wrap items-center gap-1">
            {filters.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => navigate({ filter: f.key, page: 1 })}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[13px] font-semibold transition-colors",
                    active ? "bg-blue text-[var(--band-ink)]" : "bg-surface-2 text-muted hover:text-ink",
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-[10px] border border-line bg-surface-2 px-3 py-2 sm:w-56">
              <Search className="size-[18px] text-faint" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อ รหัส หรือตำแหน่ง…"
                aria-label="ค้นหาครูและบุคลากร"
                className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
              />
            </div>
            <Button onClick={openCreate}>
              <Plus className="size-4" /> เพิ่มบุคลากร
            </Button>
          </div>
        </div>

        {staff.length > 0 ? (
          <div className={cn("overflow-x-auto border-t border-line transition-opacity", isPending && "opacity-60")}>
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>ครูและบุคลากร</TableHead>
                  <TableHead>ตำแหน่ง</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>วิชาที่สอน</TableHead>
                  <TableHead>อีเมล</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((s) => {
                  const kind = kindStyle[s.type];
                  const fullName = [s.prefix, `${s.firstName} ${s.lastName}`].filter(Boolean).join(" ");
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand-ink" aria-hidden="true">
                            {s.firstName.charAt(0)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-semibold text-ink-strong">{fullName}</p>
                            <p className="tabular text-[12.5px] text-muted">รหัส {s.code}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-[13.5px] text-ink">{s.position ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={kind.className}>
                          {kind.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="tabular text-[13.5px] font-medium text-ink">{s.subjectsCount}</span>
                        <span className="text-[12.5px] text-muted"> วิชา</span>
                      </TableCell>
                      <TableCell className="text-[13px] text-muted">{s.email ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button asChild variant="ghost" size="icon" className="size-8 text-muted hover:text-ink" aria-label={`ดูข้อมูล ${s.firstName} ${s.lastName}`}>
                                <Link href={`/dashboard/teachers/${s.id}`}>
                                  <Eye className="size-[18px]" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>ดูข้อมูล</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 text-muted hover:text-ink" aria-label={`แก้ไข ${s.firstName} ${s.lastName}`} onClick={() => openEdit(s)}>
                                <Pencil className="size-[18px]" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>แก้ไข</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 text-muted hover:text-ink" aria-label={`ลบ ${s.firstName} ${s.lastName}`} onClick={() => setDeleting(s)}>
                                <Trash2 className="size-[18px]" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>ลบ</TooltipContent>
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
          <div className="flex flex-col items-center justify-center gap-3 border-t border-line px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-faint" aria-hidden="true">
              <Search className="size-6" />
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

        <StaffFormDialog open={dialogOpen} staff={editing} canManageAccounts={canManageAccounts} onClose={() => setDialogOpen(false)} onSaved={handleSaved} />

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
      </div>
    </TooltipProvider>
  );
}
