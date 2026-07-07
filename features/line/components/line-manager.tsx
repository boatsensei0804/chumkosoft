"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Icon from "@/features/dashboard/components/icon";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import PaginationBar from "@/components/ui/pagination-bar";
import ClassroomFilter from "@/features/guardians/components/classroom-filter";
import { useListParams } from "@/features/dashboard/hooks/use-list-params";
import { generateLinkCodeAction, unlinkGuardianAction } from "@/features/line/actions";
import type { GuardianRow, StudentGuardians } from "@/features/guardians/types";
import type { GuardianClassroomOption } from "@/features/guardians/services/guardian-service";
import type { LineLinkStatus } from "@/features/line/types";
import type { Paginated } from "@/types/pagination";

const STATUS_META: Record<LineLinkStatus, { label: string; bg: string; fg: string }> = {
  linked: { label: "เชื่อม LINE แล้ว", bg: "var(--success-soft)", fg: "oklch(0.42 0.1 152)" },
  pending: { label: "รอผู้ปกครองผูก", bg: "var(--warning-soft)", fg: "oklch(0.5 0.12 55)" },
  unlinked: { label: "ยังไม่เชื่อม LINE", bg: "var(--surface-sunken)", fg: "var(--faint)" },
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
  const [toast, setToast] = useState<{ severity: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (search === query) return;
    const t = setTimeout(() => navigate({ q: search, page: 1 }), 350);
    return () => clearTimeout(t);
  }, [search, query, navigate]);

  function notify(result: { ok: boolean; message?: string }): void {
    setToast({ severity: result.ok ? "success" : "error", message: result.message ?? (result.ok ? "สำเร็จ" : "ไม่สำเร็จ") });
  }

  function generateCode(guardianId: string): void {
    setPendingId(guardianId);
    startAction(async () => {
      const result = await generateLinkCodeAction(guardianId);
      setToast({ severity: result.ok ? "success" : "error", message: result.ok ? `รหัสผูกบัญชี: ${result.code}` : result.message ?? "ไม่สำเร็จ" });
      setPendingId(null);
      if (result.ok) router.refresh();
    });
  }

  function confirmUnlink(): void {
    if (!unlinking) return;
    startAction(async () => {
      const result = await unlinkGuardianAction(unlinking.id);
      notify(result);
      setUnlinking(null);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {!configured && (
        <Alert severity="warning" sx={{ borderRadius: "var(--radius-sm)" }}>
          ยังไม่ได้ตั้งค่า LINE Official Account — สร้างรหัสผูกได้ แต่ระบบจะยังไม่ส่งข้อความจนกว่าจะตั้งค่า LINE_CHANNEL_ACCESS_TOKEN
        </Alert>
      )}

      <div className="flex items-start gap-2.5 rounded-[12px] px-4 py-3" style={{ backgroundColor: "var(--brand-softer)", border: "1px solid var(--brand-soft)" }}>
        <Icon name="info" sx={{ fontSize: 18, color: "var(--brand-ink)", marginTop: "1px" }} />
        <p className="text-[13px] leading-relaxed text-ink">
          กด “สร้างรหัส” ให้ผู้ปกครอง → ผู้ปกครองเพิ่ม LINE OA ของโรงเรียนเป็นเพื่อนและพิมพ์รหัส 6 หลักในแชท เพื่อรับแจ้งเตือนเมื่อนักเรียนเข้าโรงเรียน · เพิ่ม/แก้ไขข้อมูลผู้ปกครองได้ที่เมนู{" "}
          <Link href="/dashboard/guardians" className="font-semibold text-brand-ink underline">
            ผู้ปกครอง
          </Link>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ClassroomFilter classrooms={classrooms} value={classroomId} onChange={(id) => navigate({ classroom: id, page: 1 })} disabled={isPending} />
        <div className="flex flex-1 items-center gap-2 rounded-[10px] px-3 py-2 sm:max-w-72" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--line)" }}>
          <Icon name="search" sx={{ fontSize: 18, color: "var(--faint)" }} />
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
        <div className="rounded-[16px] px-6 py-14 text-center" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)" }}>
          <p className="text-[15px] font-semibold text-ink-strong">ไม่พบนักเรียน</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2" style={{ opacity: isPending ? 0.6 : 1, transition: "opacity 120ms ease" }}>
          {page.rows.map((student) => (
            <li key={student.studentId} className="flex flex-col overflow-hidden rounded-[16px]" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
              <div className="flex items-center justify-between gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-ink-strong">{student.name}</p>
                  <p className="tabular text-[12px] text-muted">รหัส {student.code}</p>
                </div>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold" style={{ backgroundColor: "var(--surface-2)", color: "var(--muted)" }}>
                  {student.classroom}
                </span>
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
                      <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-semibold text-ink-strong">{[g.prefix, g.fullName].filter(Boolean).join(" ")}</p>
                          <p className="text-[12px] text-muted">{g.relation}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ backgroundColor: meta.bg, color: meta.fg }}>
                            {meta.label}
                          </span>
                          {g.lineStatus === "pending" && g.linkCode && (
                            <span className="tabular rounded-md px-2 py-1 text-[13px] font-bold tracking-widest" style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand-ink)" }}>
                              {g.linkCode}
                            </span>
                          )}
                          {g.lineStatus === "linked" ? (
                            <Button size="small" variant="text" onClick={() => setUnlinking(g)}>
                              ยกเลิก LINE
                            </Button>
                          ) : (
                            <Button size="small" variant="outlined" disabled={pendingId === g.id} onClick={() => generateCode(g.id)}>
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

      <div className="overflow-hidden rounded-[16px]" style={{ border: "1px solid var(--line)", backgroundColor: "var(--bg)" }}>
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

      <Snackbar open={toast !== null} autoHideDuration={5000} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: "var(--radius-sm)" }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </div>
  );
}
