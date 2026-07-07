"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Icon from "@/features/dashboard/components/icon";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import KioskAccountDialog from "./kiosk-account-dialog";
import ResetPasswordDialog from "./reset-password-dialog";
import { deleteKioskAccountAction } from "@/features/kiosk/actions";
import type { KioskAccountRow } from "@/features/kiosk/types";

export default function KioskManager({ accounts }: { accounts: KioskAccountRow[] }): React.ReactNode {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KioskAccountRow | null>(null);
  const [resetting, setResetting] = useState<KioskAccountRow | null>(null);
  const [deleting, setDeleting] = useState<KioskAccountRow | null>(null);
  const [isDeletePending, startDelete] = useTransition();
  const [toast, setToast] = useState<{ severity: "success" | "error"; message: string } | null>(null);

  function openCreate(): void {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(a: KioskAccountRow): void {
    setEditing(a);
    setDialogOpen(true);
  }

  function handleSaved(): void {
    setDialogOpen(false);
    setToast({ severity: "success", message: editing ? "บันทึกการแก้ไขเรียบร้อย" : "สร้างบัญชีเรียบร้อย" });
    router.refresh();
  }

  function confirmDelete(): void {
    if (!deleting) return;
    startDelete(async () => {
      const result = await deleteKioskAccountAction(deleting.id);
      setToast({ severity: result.ok ? "success" : "error", message: result.message ?? (result.ok ? "ลบแล้ว" : "ลบไม่สำเร็จ") });
      setDeleting(null);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-[16px]" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center justify-between gap-3 p-4">
        <div>
          <h2 className="text-[15px] font-bold text-ink-strong">บัญชีจุดสแกน (KIOSK)</h2>
          <p className="text-[12.5px] text-muted">บัญชีสำหรับเข้าใช้งานหน้าจอสแกนใบหน้าที่ประตูโรงเรียน</p>
        </div>
        <Button variant="contained" onClick={openCreate} startIcon={<Icon name="add" sx={{ fontSize: 18 }} />}>
          เพิ่มบัญชี
        </Button>
      </div>

      {accounts.length > 0 ? (
        <div className="overflow-x-auto" style={{ borderTop: "1px solid var(--line)" }}>
          <Table sx={{ minWidth: 560 }}>
            <TableHead>
              <TableRow>
                <TableCell>อีเมล</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell>สร้างเมื่อ</TableCell>
                <TableCell align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.id} sx={{ "&:last-child td": { borderBottom: 0 }, "&:hover": { backgroundColor: "var(--surface-2)" }, transition: "background-color 120ms ease" }}>
                  <TableCell>
                    <span className="text-[14px] font-medium text-ink-strong">{a.email}</span>
                  </TableCell>
                  <TableCell>
                    {a.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ backgroundColor: "var(--success-soft)", color: "oklch(0.42 0.1 152)" }}>
                        <Icon name="success" sx={{ fontSize: 13 }} /> ใช้งาน
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ backgroundColor: "var(--surface-sunken)", color: "var(--faint)" }}>
                        ปิดใช้งาน
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="tabular text-[13px] text-muted">{a.createdAt}</span>
                  </TableCell>
                  <TableCell align="right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Tooltip title="ตั้งรหัสผ่านใหม่" arrow>
                        <IconButton size="small" aria-label={`ตั้งรหัสผ่านใหม่ ${a.email}`} onClick={() => setResetting(a)}>
                          <Icon name="lock" sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="แก้ไข" arrow>
                        <IconButton size="small" aria-label={`แก้ไข ${a.email}`} onClick={() => openEdit(a)}>
                          <Icon name="edit" sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="ลบ" arrow>
                        <IconButton size="small" aria-label={`ลบ ${a.email}`} onClick={() => setDeleting(a)}>
                          <Icon name="delete" sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center" style={{ borderTop: "1px solid var(--line)" }}>
          <span className="grid size-12 place-items-center rounded-full" style={{ backgroundColor: "var(--surface-2)", color: "var(--faint)" }} aria-hidden="true">
            <Icon name="face" sx={{ fontSize: 24 }} />
          </span>
          <p className="text-[15px] font-semibold text-ink-strong">ยังไม่มีบัญชีจุดสแกน</p>
          <p className="text-[13.5px] text-muted">เพิ่มบัญชีเพื่อใช้ล็อกอินที่หน้าจอสแกนใบหน้า</p>
        </div>
      )}

      <KioskAccountDialog open={dialogOpen} account={editing} onClose={() => setDialogOpen(false)} onSaved={handleSaved} />

      {resetting && (
        <ResetPasswordDialog
          open
          accountId={resetting.id}
          accountEmail={resetting.email}
          onClose={() => setResetting(null)}
          onDone={(r) => {
            setResetting(null);
            setToast({ severity: r.ok ? "success" : "error", message: r.message ?? "" });
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="ลบบัญชีจุดสแกน"
        message={deleting ? `ต้องการลบบัญชี “${deleting.email}” ใช่หรือไม่? บัญชีนี้จะเข้าใช้งานหน้าสแกนไม่ได้อีก` : ""}
        confirmLabel="ลบบัญชี"
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
