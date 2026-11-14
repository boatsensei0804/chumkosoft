"use client";

import { useEffect, useState, useTransition } from "react";
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
import CourseFormDialog from "./course-form-dialog";
import MobileRecordCard from "@/features/dashboard/components/mobile-record-card";
import RecordPreviewDialog from "@/features/dashboard/components/record-preview-dialog";
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
  const [viewing, setViewing] = useState<CourseSummary | null>(null);
  const [deleting, setDeleting] = useState<CourseSummary | null>(null);
  const [isDeletePending, startDelete] = useTransition();

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
    toast.success(editing ? "บันทึกการแก้ไขเรียบร้อย" : "เพิ่มรายวิชาเรียบร้อย");
    router.refresh();
  }

  function confirmDelete(): void {
    if (!deleting) return;
    startDelete(async () => {
      const result = await deleteCourseAction(deleting.id);
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
          <h2 className="text-[14px] font-bold text-ink-strong">รายวิชาทั้งหมด</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-line bg-surface-2 px-3 py-2 sm:w-56 sm:flex-none">
              <Search className="size-[18px] text-faint" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหารหัสหรือชื่อวิชา…"
                aria-label="ค้นหารายวิชา"
                className="min-w-0 w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
              />
            </div>
            <Button onClick={openCreate}>
              <Plus className="size-4" /> เพิ่มรายวิชา
            </Button>
          </div>
        </div>

        {courses.length > 0 ? (
          <>
          <div className={cn("grid gap-3 border-t border-line p-3 md:hidden", isPending && "opacity-60")}>
            {courses.map((c) => <MobileRecordCard key={c.id} title={c.name} subtitle={`รหัส ${c.code}`}
              fields={[{ label: "หน่วยกิต", value: c.credits ?? "—" }, { label: "เปิดสอน", value: `${c.offeringsCount} ห้อง` }]}
              actions={<><Button variant="outline" size="sm" className="min-h-10" onClick={() => setViewing(c)}><Eye className="size-4" /> ดูข้อมูล</Button><Button variant="outline" size="sm" className="min-h-10" onClick={() => openEdit(c)}><Pencil className="size-4" /> แก้ไข</Button><Button variant="ghost" size="sm" className="min-h-10 text-danger" onClick={() => setDeleting(c)}><Trash2 className="size-4" /> ลบ</Button></>}
            />)}
          </div>
          <div className={cn("hidden overflow-x-auto border-t border-line transition-opacity md:block", isPending && "opacity-60")}>
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>รหัสวิชา</TableHead>
                  <TableHead>ชื่อรายวิชา</TableHead>
                  <TableHead>หน่วยกิต</TableHead>
                  <TableHead>เปิดสอน</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Badge variant="secondary" className="tabular bg-brand-soft text-brand-ink">
                        {c.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[14px] font-semibold text-ink-strong">{c.name}</TableCell>
                    <TableCell className="tabular text-[13.5px] text-ink">{c.credits ?? "—"}</TableCell>
                    <TableCell>
                      {c.offeringsCount > 0 ? (
                        <span className="tabular text-[13.5px] text-ink">{c.offeringsCount} ห้อง</span>
                      ) : (
                        <span className="text-[13px] text-faint">ยังไม่เปิด</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="size-8 text-muted hover:text-ink" aria-label={`ดูข้อมูล ${c.name}`} onClick={() => setViewing(c)}><Eye className="size-[18px]" /></Button></TooltipTrigger><TooltipContent>ดูข้อมูล</TooltipContent></Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 text-muted hover:text-ink" aria-label={`แก้ไข ${c.name}`} onClick={() => openEdit(c)}>
                              <Pencil className="size-[18px]" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>แก้ไข</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 text-muted hover:text-ink" aria-label={`ลบ ${c.name}`} onClick={() => setDeleting(c)}>
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
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 border-t border-line px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-faint" aria-hidden="true">
              <Search className="size-6" />
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
        {viewing && <RecordPreviewDialog open title={viewing.name} subtitle={`รหัสวิชา ${viewing.code}`} fields={[{ label: "หน่วยกิต", value: viewing.credits ?? "—" }, { label: "ห้องที่เปิดสอน", value: `${viewing.offeringsCount} ห้อง` }, { label: "คำอธิบาย", value: viewing.description ?? "—" }]} onClose={() => setViewing(null)} onEdit={() => { const course = viewing; setViewing(null); openEdit(course); }} />}

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
      </div>
    </TooltipProvider>
  );
}
