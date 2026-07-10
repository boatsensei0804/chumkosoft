"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import PaginationBar from "@/components/ui/pagination-bar";
import ClassroomFilter from "./classroom-filter";
import GuardianFormDialog from "./guardian-form-dialog";
import { useListParams } from "@/features/dashboard/hooks/use-list-params";
import { deleteGuardianAction } from "@/features/guardians/actions";
import type { GuardianRow, StudentGuardians } from "@/features/guardians/types";
import type { GuardianClassroomOption } from "@/features/guardians/services/guardian-service";
import type { Paginated } from "@/types/pagination";

interface GuardianManagerProps {
  page: Paginated<StudentGuardians>;
  query: string;
  classrooms: GuardianClassroomOption[];
  classroomId: string;
}

type Editing = { studentId: string; studentName: string; guardian: GuardianRow | null };

/** Joins the non-empty guardian detail bits into one readable line. */
function detailLine(g: GuardianRow): string {
  return [
    g.relation,
    g.occupation && `อาชีพ ${g.occupation}`,
    g.monthlyIncome !== null ? `รายได้ ${g.monthlyIncome.toLocaleString("th-TH")} บาท/เดือน` : null,
    g.phone && `โทร ${g.phone}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function GuardianManager({ page, query, classrooms, classroomId }: GuardianManagerProps): React.ReactNode {
  const router = useRouter();
  const { navigate, isPending } = useListParams("/dashboard/guardians", { q: query, page: page.page, classroom: classroomId });
  const [search, setSearch] = useState(query);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<GuardianRow | null>(null);
  const [isRemovePending, startRemove] = useTransition();

  useEffect(() => {
    if (search === query) return;
    const t = setTimeout(() => navigate({ q: search, page: 1 }), 350);
    return () => clearTimeout(t);
  }, [search, query, navigate]);

  function handleSaved(): void {
    setEditing(null);
    toast.success("บันทึกผู้ปกครองเรียบร้อย");
    router.refresh();
  }

  function confirmDelete(): void {
    if (!deleting) return;
    startRemove(async () => {
      const result = await deleteGuardianAction(deleting.id);
      if (result.ok) toast.success(result.message ?? "ลบเรียบร้อย");
      else toast.error(result.message ?? "ลบไม่สำเร็จ");
      setDeleting(null);
      if (result.ok) router.refresh();
    });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <ClassroomFilter classrooms={classrooms} value={classroomId} onChange={(id) => navigate({ classroom: id, page: 1 })} disabled={isPending} />
          <div className="flex flex-1 items-center gap-2 rounded-[10px] border border-line bg-surface-2 px-3 py-2 sm:max-w-72">
            <Search className="size-[18px] text-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อหรือรหัสนักเรียน…"
              aria-label="ค้นหานักเรียน"
              className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
            />
          </div>
        </div>

        {page.rows.length === 0 ? (
          <div className="rounded-2xl border border-line bg-card px-6 py-14 text-center">
            <p className="text-[15px] font-semibold text-ink-strong">ไม่พบนักเรียน</p>
          </div>
        ) : (
          <ul className={cn("grid grid-cols-1 gap-3 transition-opacity xl:grid-cols-2", isPending && "opacity-60")}>
            {page.rows.map((student) => (
              <li key={student.studentId} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-bold text-ink-strong">{student.name}</p>
                      <p className="tabular text-[12px] text-muted">รหัส {student.code}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] font-semibold text-muted">{student.classroom}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-brand-ink" onClick={() => setEditing({ studentId: student.studentId, studentName: student.name, guardian: null })}>
                    <Plus className="size-4" /> เพิ่มผู้ปกครอง
                  </Button>
                </div>

                {student.guardians.length === 0 ? (
                  <p className="px-4 py-5 text-[13px] text-faint">ยังไม่มีผู้ปกครอง</p>
                ) : (
                  <ul className="flex flex-col">
                    {student.guardians.map((g) => (
                      <li key={g.id} className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 last:border-b-0">
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-semibold text-ink-strong">{[g.prefix, g.fullName].filter(Boolean).join(" ")}</p>
                          <p className="truncate text-[12px] text-muted">{detailLine(g)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 text-muted hover:text-ink" aria-label={`แก้ไข ${g.fullName}`} onClick={() => setEditing({ studentId: student.studentId, studentName: student.name, guardian: g })}>
                                <Pencil className="size-[17px]" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>แก้ไข</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 text-muted hover:text-ink" aria-label={`ลบ ${g.fullName}`} onClick={() => setDeleting(g)}>
                                <Trash2 className="size-[17px]" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>ลบ</TooltipContent>
                          </Tooltip>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="overflow-hidden rounded-2xl border border-line bg-card">
          <PaginationBar page={page.page} pageCount={page.pageCount} total={page.total} pageSize={page.pageSize} disabled={isPending} onPageChange={(p) => navigate({ page: p })} />
        </div>

        {editing && (
          <GuardianFormDialog
            open
            studentId={editing.studentId}
            studentName={editing.studentName}
            guardian={editing.guardian}
            onClose={() => setEditing(null)}
            onSaved={handleSaved}
          />
        )}

        <ConfirmDialog
          open={deleting !== null}
          title="ลบผู้ปกครอง"
          message={deleting ? `ต้องการลบ “${deleting.fullName}” ใช่หรือไม่?` : ""}
          confirmLabel="ลบผู้ปกครอง"
          destructive
          pending={isRemovePending}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
        />
      </div>
    </TooltipProvider>
  );
}
