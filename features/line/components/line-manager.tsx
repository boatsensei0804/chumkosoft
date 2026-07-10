"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Search, Info, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import PaginationBar from "@/components/ui/pagination-bar";
import ClassroomFilter from "@/features/guardians/components/classroom-filter";
import { useListParams } from "@/features/dashboard/hooks/use-list-params";
import { generateLinkCodeAction, unlinkGuardianAction } from "@/features/line/actions";
import type { GuardianRow, StudentGuardians } from "@/features/guardians/types";
import type { GuardianClassroomOption } from "@/features/guardians/services/guardian-service";
import type { LineLinkStatus } from "@/features/line/types";
import type { Paginated } from "@/types/pagination";

const STATUS_META: Record<LineLinkStatus, { label: string; className: string }> = {
  linked: { label: "เชื่อม LINE แล้ว", className: "bg-success-soft text-[oklch(0.42_0.1_152)] border-success/30" },
  pending: { label: "รอผู้ปกครองผูก", className: "bg-warning-soft text-[oklch(0.5_0.12_55)] border-warning/30" },
  unlinked: { label: "ยังไม่เชื่อม LINE", className: "bg-surface-sunken text-faint border-line" },
};

interface LineManagerProps {
  page: Paginated<StudentGuardians>;
  query: string;
  configured: boolean;
  classrooms: GuardianClassroomOption[];
  classroomId: string;
}

export default function LineManager({ page, query, configured, classrooms, classroomId }: LineManagerProps): React.ReactNode {
  const router = useRouter();
  const { navigate, isPending } = useListParams("/dashboard/line", { q: query, page: page.page, classroom: classroomId });
  const [search, setSearch] = useState(query);
  const [unlinking, setUnlinking] = useState<GuardianRow | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startAction] = useTransition();

  useEffect(() => {
    if (search === query) return;
    const t = setTimeout(() => navigate({ q: search, page: 1 }), 350);
    return () => clearTimeout(t);
  }, [search, query, navigate]);

  function generateCode(guardianId: string): void {
    setPendingId(guardianId);
    startAction(async () => {
      const result = await generateLinkCodeAction(guardianId);
      if (result.ok) toast.success(`รหัสผูกบัญชี: ${result.code}`);
      else toast.error(result.message ?? "ไม่สำเร็จ");
      setPendingId(null);
      if (result.ok) router.refresh();
    });
  }

  function confirmUnlink(): void {
    if (!unlinking) return;
    startAction(async () => {
      const result = await unlinkGuardianAction(unlinking.id);
      if (result.ok) toast.success(result.message ?? "ยกเลิกการเชื่อมแล้ว");
      else toast.error(result.message ?? "ไม่สำเร็จ");
      setUnlinking(null);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {!configured && (
        <p className="flex items-start gap-2.5 rounded-[12px] border border-warning/30 bg-warning-soft px-4 py-3 text-[13px] leading-relaxed text-ink">
          <TriangleAlert className="mt-0.5 size-[18px] shrink-0 text-warning" />
          ยังไม่ได้ตั้งค่า LINE Official Account — สร้างรหัสผูกได้ แต่ระบบจะยังไม่ส่งข้อความจนกว่าจะตั้งค่า LINE_CHANNEL_ACCESS_TOKEN
        </p>
      )}

      <div className="flex items-start gap-2.5 rounded-[12px] border border-brand-soft bg-brand-softer px-4 py-3">
        <Info className="mt-0.5 size-[18px] shrink-0 text-brand-ink" />
        <p className="text-[13px] leading-relaxed text-ink">
          กด “สร้างรหัส” ให้ผู้ปกครอง → ผู้ปกครองเพิ่ม LINE OA ของโรงเรียนเป็นเพื่อนและพิมพ์รหัส 6 หลักในแชท เพื่อรับแจ้งเตือนเมื่อนักเรียนเข้าโรงเรียน · เพิ่ม/แก้ไขข้อมูลผู้ปกครองได้ที่เมนู{" "}
          <Link href="/dashboard/guardians" className="font-semibold text-brand-ink underline">
            ผู้ปกครอง
          </Link>
        </p>
      </div>

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
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-ink-strong">{student.name}</p>
                  <p className="tabular text-[12px] text-muted">รหัส {student.code}</p>
                </div>
                <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] font-semibold text-muted">{student.classroom}</span>
              </div>

              {student.guardians.length === 0 ? (
                <p className="px-4 py-5 text-[13px] text-faint">
                  ยังไม่มีผู้ปกครอง — เพิ่มได้ที่เมนู{" "}
                  <Link href="/dashboard/guardians" className="font-semibold underline">
                    ผู้ปกครอง
                  </Link>
                </p>
              ) : (
                <ul className="flex flex-col">
                  {student.guardians.map((g) => {
                    const meta = STATUS_META[g.lineStatus];
                    return (
                      <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 last:border-b-0">
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-semibold text-ink-strong">{[g.prefix, g.fullName].filter(Boolean).join(" ")}</p>
                          <p className="text-[12px] text-muted">{g.relation}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className={meta.className}>
                            {meta.label}
                          </Badge>
                          {g.lineStatus === "pending" && g.linkCode && (
                            <span className="tabular rounded-md bg-brand-soft px-2 py-1 text-[13px] font-bold tracking-widest text-brand-ink">{g.linkCode}</span>
                          )}
                          {g.lineStatus === "linked" ? (
                            <Button variant="ghost" size="sm" onClick={() => setUnlinking(g)}>
                              ยกเลิก LINE
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" disabled={pendingId === g.id} onClick={() => generateCode(g.id)}>
                              {g.lineStatus === "pending" ? "สร้างรหัสใหม่" : "สร้างรหัส"}
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        <PaginationBar page={page.page} pageCount={page.pageCount} total={page.total} pageSize={page.pageSize} disabled={isPending} onPageChange={(p) => navigate({ page: p })} />
      </div>

      <ConfirmDialog
        open={unlinking !== null}
        title="ยกเลิกการเชื่อม LINE"
        message={unlinking ? `ต้องการยกเลิกการเชื่อม LINE ของ “${unlinking.fullName}” ใช่หรือไม่? ผู้ปกครองจะไม่ได้รับแจ้งเตือนอีก` : ""}
        confirmLabel="ยกเลิกการเชื่อม"
        destructive
        onConfirm={confirmUnlink}
        onClose={() => setUnlinking(null)}
      />
    </div>
  );
}
