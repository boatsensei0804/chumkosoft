"use client";

import RecordActions from "@/features/dashboard/components/record-actions";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import StatusChip from "./status-chip";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import PaginationBar from "@/components/ui/pagination-bar";
import StudentFormDialog from "@/features/students/components/student-form-dialog";
import MobileRecordCard from "./mobile-record-card";
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

  function notify(ok: boolean, message: string): void {
    if (ok) toast.success(message);
    else toast.error(message);
  }

  function confirmBulkDelete(): void {
    const ids = selectedOnPage;
    startBulk(async () => {
      const result = await deleteStudentsAction(ids);
      notify(result.ok, result.message ?? (result.ok ? "ลบเรียบร้อย" : "ลบไม่สำเร็จ"));
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
    toast.success(editing ? "บันทึกการแก้ไขเรียบร้อย" : "เพิ่มนักเรียนเรียบร้อย");
    router.refresh();
  }

  function confirmDelete(): void {
    if (!deleting) return;
    startDelete(async () => {
      const result = await deleteStudentAction(deleting.id);
      notify(result.ok, result.message ?? (result.ok ? "ลบเรียบร้อย" : "ลบไม่สำเร็จ"));
      setDeleting(null);
      if (result.ok) router.refresh();
    });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
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

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-line bg-surface-2 px-3 py-2 sm:w-56 sm:flex-none">
              <Search className="size-[18px] text-faint" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อ หรือรหัส…"
                aria-label="ค้นหานักเรียน"
                className="min-w-0 w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
              />
            </div>
            <Button onClick={openCreate}>
              <Plus className="size-4" /> เพิ่มนักเรียน
            </Button>
          </div>
        </div>

        {selectedOnPage.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-line bg-brand-soft px-4 py-2.5">
            <span className="text-[13.5px] font-semibold text-brand-ink">เลือกแล้ว {selectedOnPage.length} คน</span>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                ล้างการเลือก
              </Button>
              <Button size="sm" onClick={() => setBulkOpen(true)} className="bg-destructive text-white hover:bg-destructive/90">
                <Trash2 className="size-4" /> ลบที่เลือก
              </Button>
            </div>
          </div>
        )}

        {students.length > 0 ? (
          <>
          <div className={cn("grid gap-3 border-t border-line p-3 md:hidden", isPending && "opacity-60")}>
            {students.map((s) => <MobileRecordCard key={s.id}
              title={<span className="flex items-start gap-2"><Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggleOne(s.id)} aria-label={`เลือก ${s.firstName} ${s.lastName}`} /><span>{[s.prefix, `${s.firstName} ${s.lastName}`].filter(Boolean).join(" ")}</span></span>}
              subtitle={`รหัส ${s.code} · ${s.classroom}`}
              badge={<StatusChip status={s.status} />}
              fields={[{ label: "ระดับ", value: s.grade }, { label: "วันที่ลงทะเบียน", value: s.enrolledAt }]}
              actions={<><Button asChild variant="outline" size="sm" className="min-h-10"><Link href={`/dashboard/students/${s.id}`}><Eye className="size-4" /> ดูข้อมูล</Link></Button><Button variant="outline" size="sm" className="min-h-10" onClick={() => openEdit(s)}><Pencil className="size-4" /> แก้ไข</Button><Button variant="ghost" size="sm" className="min-h-10 text-danger" onClick={() => setDeleting(s)}><Trash2 className="size-4" /> ลบ</Button></>}
            />)}
          </div>
          <div className={cn("hidden overflow-x-auto border-t border-line transition-opacity md:block", isPending && "opacity-60")}>
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-11">
                    <Checkbox
                      checked={someSelected ? "indeterminate" : allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="เลือกนักเรียนทั้งหมดในหน้านี้"
                    />
                  </TableHead>
                  <TableHead>นักเรียน</TableHead>
                  <TableHead>ชั้นเรียน</TableHead>
                  <TableHead>ระดับ</TableHead>
                  <TableHead>วันที่ลงทะเบียน</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => {
                  const isSelected = selected.has(s.id);
                  const fullName = [s.prefix, `${s.firstName} ${s.lastName}`].filter(Boolean).join(" ");
                  return (
                    <TableRow key={s.id} data-state={isSelected ? "selected" : undefined} className="data-[state=selected]:bg-brand-soft">
                      <TableCell>
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleOne(s.id)} aria-label={`เลือก ${s.firstName} ${s.lastName}`} />
                      </TableCell>
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
                      <TableCell className="text-[14px] font-medium text-ink">{s.classroom}</TableCell>
                      <TableCell className="text-[13.5px] text-muted">{s.grade}</TableCell>
                      <TableCell className="tabular text-[13.5px] text-muted">{s.enrolledAt}</TableCell>
                      <TableCell>
                        <StatusChip status={s.status} />
                      </TableCell>
                      <TableCell className="text-right"><RecordActions name={`${s.firstName} ${s.lastName}`} href={`/dashboard/students/${s.id}`} onEdit={() => openEdit(s)} onDelete={() => setDeleting(s)} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 border-t border-line px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-faint" aria-hidden="true">
              <Search className="size-6" />
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
      </div>
    </TooltipProvider>
  );
}
