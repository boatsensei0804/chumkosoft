"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Icon from "@/features/dashboard/components/icon";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import PaginationBar from "@/components/ui/pagination-bar";
import GuardianFormDialog from "./guardian-form-dialog";
import { useListParams } from "@/features/dashboard/hooks/use-list-params";
import { deleteGuardianAction } from "@/features/guardians/actions";
import type { GuardianRow, StudentGuardians } from "@/features/guardians/types";
import type { Paginated } from "@/types/pagination";

interface GuardianManagerProps {
  page: Paginated<StudentGuardians>;
  query: string;
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

export default function GuardianManager({ page, query }: GuardianManagerProps): React.ReactNode {
  const router = useRouter();
  const { navigate, isPending } = useListParams("/dashboard/guardians", { q: query, page: page.page });
  const [search, setSearch] = useState(query);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<GuardianRow | null>(null);
  const [isRemovePending, startRemove] = useTransition();
  const [toast, setToast] = useState<{ severity: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (search === query) return;
    const t = setTimeout(() => navigate({ q: search, page: 1 }), 350);
    return () => clearTimeout(t);
  }, [search, query, navigate]);

  function handleSaved(): void {
    setEditing(null);
    setToast({ severity: "success", message: "บันทึกผู้ปกครองเรียบร้อย" });
    router.refresh();
  }

  function confirmDelete(): void {
    if (!deleting) return;
    startRemove(async () => {
      const result = await deleteGuardianAction(deleting.id);
      setToast({ severity: result.ok ? "success" : "error", message: result.message ?? (result.ok ? "ลบเรียบร้อย" : "ลบไม่สำเร็จ") });
      setDeleting(null);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-[10px] px-3 py-2 sm:w-72" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--line)" }}>
        <Icon name="search" sx={{ fontSize: 18, color: "var(--faint)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อหรือรหัสนักเรียน…"
          aria-label="ค้นหานักเรียน"
          className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
        />
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
                <Button size="small" variant="text" startIcon={<Icon name="add" sx={{ fontSize: 16 }} />} onClick={() => setEditing({ studentId: student.studentId, studentName: student.name, guardian: null })}>
                  เพิ่มผู้ปกครอง
                </Button>
              </div>

              {student.guardians.length === 0 ? (
                <p className="px-4 py-5 text-[13px] text-faint">ยังไม่มีผู้ปกครอง</p>
              ) : (
                <ul className="flex flex-col">
                  {student.guardians.map((g) => (
                    <li key={g.id} className="flex items-center justify-between gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold text-ink-strong">{[g.prefix, g.fullName].filter(Boolean).join(" ")}</p>
                        <p className="truncate text-[12px] text-muted">{detailLine(g)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Tooltip title="แก้ไข" arrow>
                          <IconButton size="small" aria-label={`แก้ไข ${g.fullName}`} onClick={() => setEditing({ studentId: student.studentId, studentName: student.name, guardian: g })}>
                            <Icon name="edit" sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="ลบ" arrow>
                          <IconButton size="small" aria-label={`ลบ ${g.fullName}`} onClick={() => setDeleting(g)}>
                            <Icon name="delete" sx={{ fontSize: 17 }} />
                          </IconButton>
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

      <div className="overflow-hidden rounded-[16px]" style={{ border: "1px solid var(--line)", backgroundColor: "var(--bg)" }}>
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
