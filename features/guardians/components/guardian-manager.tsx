"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import PaginationBar from "@/components/ui/pagination-bar";
import ClassroomFilter from "./classroom-filter";
import GuardianFormDialog from "./guardian-form-dialog";
import MobileRecordCard from "@/features/dashboard/components/mobile-record-card";
import RecordActions from "@/features/dashboard/components/record-actions";
import RecordPreviewDialog from "@/features/dashboard/components/record-preview-dialog";
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
  const [viewing, setViewing] = useState<{ studentId: string; studentName: string; guardian: GuardianRow } | null>(null);
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
        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[14px] font-bold text-ink-strong">เลือกห้องเรียน</h2>
            <p className="text-[12px] text-muted">กรองรายชื่อนักเรียนและผู้ปกครองตามห้อง</p>
            <ClassroomFilter classrooms={classrooms} value={classroomId} onChange={(id) => navigate({ classroom: id, page: 1 })} disabled={isPending} />
          </div>
          <div className="flex w-full items-center gap-2 rounded-[10px] border border-line bg-surface-2 px-3 py-2 sm:max-w-72">
            <Search className="size-[18px] shrink-0 text-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อนักเรียนหรือรหัส…"
              aria-label="ค้นหานักเรียน"
              className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
            />
          </div>
        </section>

        {page.rows.length === 0 ? (
          <div className="rounded-2xl border border-line bg-card px-6 py-14 text-center">
            <p className="text-[15px] font-semibold text-ink-strong">ไม่พบนักเรียนในห้องที่เลือก</p>
          </div>
        ) : (
          <>
          <div className={cn("grid gap-3 rounded-xl border border-line bg-card p-3 transition-opacity md:hidden", isPending && "opacity-60")}>
            {page.rows.map((student) => <MobileRecordCard key={student.studentId} title={student.name} subtitle={`รหัส ${student.code} · ${student.classroom}`}
              fields={[{ label: "ผู้ปกครอง", value: student.guardians.length ? `${student.guardians.length} คน` : "ยังไม่มี" }, { label: "ผูก LINE", value: `${student.guardians.filter((g) => g.lineStatus === "linked").length} คน` }]}
              actions={<div className="w-full space-y-2"><Button variant="outline" size="sm" className="min-h-10" onClick={() => setEditing({ studentId: student.studentId, studentName: student.name, guardian: null })}><Plus className="size-4" /> เพิ่มผู้ปกครอง</Button>{student.guardians.map((g) => <div key={g.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-2 p-2.5"><div className="min-w-0"><p className="text-sm font-semibold text-ink">{[g.prefix, g.fullName].filter(Boolean).join(" ")}</p><p className="text-xs text-muted">{g.relation} · {g.lineStatus === "linked" ? "ผูก LINE แล้ว" : g.lineStatus === "pending" ? "รอผูก LINE" : "ยังไม่ผูก LINE"}</p></div><div className="flex gap-1"><Button variant="ghost" size="sm" className="min-h-10" onClick={() => setViewing({ studentId: student.studentId, studentName: student.name, guardian: g })}><Eye className="size-4" /> ดู</Button><Button variant="ghost" size="sm" className="min-h-10" onClick={() => setEditing({ studentId: student.studentId, studentName: student.name, guardian: g })}><Pencil className="size-4" /> แก้ไข</Button><Button variant="ghost" size="sm" className="min-h-10 text-danger" onClick={() => setDeleting(g)}><Trash2 className="size-4" /> ลบ</Button></div></div>)}</div>}
            />)}
          </div>
          <div className={cn("hidden overflow-x-auto rounded-xl border border-line bg-card transition-opacity md:block", isPending && "opacity-60")}>
            <Table className="min-w-[820px]">
              <TableHeader>
                <TableRow>
                  <TableHead>นักเรียน</TableHead>
                  <TableHead>ห้องเรียน</TableHead>
                  <TableHead>ข้อมูลผู้ปกครอง</TableHead>
                  <TableHead>สถานะ LINE</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.rows.map((student) => (
                  <TableRow key={student.studentId}>
                    <TableCell className="min-w-48">
                      <p className="text-[13.5px] font-semibold text-ink-strong">{student.name}</p>
                      <p className="tabular text-[12px] text-muted">รหัส {student.code}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-surface-2 text-muted">{student.classroom}</Badge>
                    </TableCell>
                    <TableCell className="min-w-[300px] whitespace-normal">
                      {student.guardians.length === 0 ? (
                        <span className="text-[12.5px] text-faint">ยังไม่มีผู้ปกครอง</span>
                      ) : (
                        <div className="flex flex-col divide-y divide-line">
                          {student.guardians.map((g) => (
                            <div key={g.id} className="py-2 first:pt-0 last:pb-0">
                              <p className="text-[13px] font-semibold text-ink-strong">{[g.prefix, g.fullName].filter(Boolean).join(" ")}</p>
                              <p className="mt-0.5 text-[11.5px] text-muted">{detailLine(g)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="min-w-36 whitespace-normal">
                      {student.guardians.length > 0 && (
                        <div className="flex flex-col gap-2">
                          {student.guardians.map((g) => (
                            <div key={g.id} className="flex min-h-8 items-center">
                              {g.lineStatus === "linked" ? (
                                <Badge variant="secondary" className="bg-success-soft text-[oklch(0.42_0.1_152)]">เชื่อมแล้ว</Badge>
                              ) : g.lineStatus === "pending" ? (
                                <Badge variant="secondary" className="bg-warning-soft text-[oklch(0.5_0.12_55)]">รอเชื่อม</Badge>
                              ) : (
                                <span className="text-[11.5px] text-muted">ยังไม่เชื่อม</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <Button variant="ghost" size="sm" className="text-brand-ink" onClick={() => setEditing({ studentId: student.studentId, studentName: student.name, guardian: null })}>
                          <Plus className="size-4" /> เพิ่ม
                        </Button>
                        {student.guardians.map((g) => <div key={g.id} className="py-1"><RecordActions name={g.fullName} onView={() => setViewing({ studentId: student.studentId, studentName: student.name, guardian: g })} onEdit={() => setEditing({ studentId: student.studentId, studentName: student.name, guardian: g })} onDelete={() => setDeleting(g)} /></div>)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          </>
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

        {viewing && <RecordPreviewDialog open title={[viewing.guardian.prefix, viewing.guardian.fullName].filter(Boolean).join(" ")} subtitle={`ผู้ปกครองของ ${viewing.studentName}`} fields={[{ label: "ความสัมพันธ์", value: viewing.guardian.relation }, { label: "เบอร์โทรศัพท์", value: viewing.guardian.phone ?? "—" }, { label: "อาชีพ", value: viewing.guardian.occupation ?? "—" }, { label: "กรุ๊ปเลือด", value: viewing.guardian.bloodType ?? "—" }, { label: "สถานะ LINE", value: viewing.guardian.lineStatus === "linked" ? "ผูกแล้ว" : viewing.guardian.lineStatus === "pending" ? "รอผูก" : "ยังไม่ผูก" }]} onClose={() => setViewing(null)} onEdit={() => { const item = viewing; setViewing(null); setEditing(item); }} />}

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
