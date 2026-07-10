"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Search, Plus, Pencil, Trash2, ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return classrooms;
    return classrooms.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.gradeLevel.toLowerCase().includes(q) ||
        c.advisors.some((a) => a.name.toLowerCase().includes(q)),
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
    toast.success(editing ? "บันทึกการแก้ไขเรียบร้อย" : "เพิ่มห้องเรียนเรียบร้อย");
    router.refresh();
  }

  function confirmDelete(): void {
    if (!deleting) return;
    startDelete(async () => {
      const result = await deleteClassroomAction(deleting.id);
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
          <h2 className="text-[14px] font-bold text-ink-strong">ห้องเรียนทั้งหมด · ปีการศึกษาปัจจุบัน</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-[10px] border border-line bg-surface-2 px-3 py-2 sm:w-56">
              <Search className="size-[18px] text-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาห้อง ระดับชั้น หรือครูที่ปรึกษา…"
                aria-label="ค้นหาห้องเรียน"
                className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
              />
            </div>
            <Button onClick={openCreate}>
              <Plus className="size-4" /> เพิ่มห้องเรียน
            </Button>
          </div>
        </div>

        {results.length > 0 ? (
          <div className="overflow-x-auto border-t border-line">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>ห้องเรียน</TableHead>
                  <TableHead>ครูที่ปรึกษา</TableHead>
                  <TableHead>นักเรียน</TableHead>
                  <TableHead>รายวิชา</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/dashboard/classrooms/${c.id}`} className="group flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-[10px] bg-brand-soft text-brand-ink">
                          <Users className="size-[19px]" />
                        </span>
                        <span>
                          <span className="block text-[14px] font-semibold text-ink-strong group-hover:text-brand-ink">{c.code}</span>
                          <span className="block text-[12.5px] text-muted">{c.gradeLevel}</span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {c.advisors.length > 0 ? (
                        <span className="text-[13.5px] text-ink">{c.advisors.map((a) => a.name).join(", ")}</span>
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
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button asChild variant="ghost" size="icon" className="size-8 text-muted hover:text-ink" aria-label={`รายละเอียด ${c.code}`}>
                              <Link href={`/dashboard/classrooms/${c.id}`}>
                                <ArrowRight className="size-[18px]" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>รายละเอียด</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 text-muted hover:text-ink" aria-label={`แก้ไข ${c.code}`} onClick={() => openEdit(c)}>
                              <Pencil className="size-[18px]" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>แก้ไข</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 text-muted hover:text-ink" aria-label={`ลบ ${c.code}`} onClick={() => setDeleting(c)}>
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
              <Users className="size-6" />
            </span>
            <p className="text-[15px] font-semibold text-ink-strong">
              {classrooms.length === 0 ? "ยังไม่มีห้องเรียนในปีการศึกษานี้ เริ่มด้วยการเพิ่มห้องแรก" : "ไม่พบห้องเรียนที่ค้นหา"}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-line bg-surface px-5 py-3 text-[13px] text-muted">
          <span className="tabular">
            แสดง {results.length} จาก {classrooms.length} ห้อง
          </span>
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
      </div>
    </TooltipProvider>
  );
}
