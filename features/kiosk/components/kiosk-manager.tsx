"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, KeyRound, ScanFace, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
    toast.success(editing ? "บันทึกการแก้ไขเรียบร้อย" : "สร้างบัญชีเรียบร้อย");
    router.refresh();
  }

  function confirmDelete(): void {
    if (!deleting) return;
    const target = deleting;
    startDelete(async () => {
      const result = await deleteKioskAccountAction(target.id);
      if (result.ok) toast.success(result.message ?? "ลบแล้ว");
      else toast.error(result.message ?? "ลบไม่สำเร็จ");
      setDeleting(null);
      if (result.ok) router.refresh();
    });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 p-4">
          <div>
            <h2 className="text-[15px] font-bold text-ink-strong">บัญชีจุดสแกน (KIOSK)</h2>
            <p className="text-[12.5px] text-muted">บัญชีสำหรับเข้าใช้งานหน้าจอสแกนใบหน้าที่ประตูโรงเรียน</p>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="size-4" /> เพิ่มบัญชี
          </Button>
        </div>

        {accounts.length > 0 ? (
          <div className="border-t border-line">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>อีเมล</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>สร้างเมื่อ</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium text-ink-strong">{a.email}</TableCell>
                    <TableCell>
                      {a.isActive ? (
                        <Badge variant="outline" className="gap-1 border-success/30 bg-success-soft text-[oklch(0.42_0.1_152)]">
                          <CheckCircle2 className="size-3" /> ใช้งาน
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">
                          ปิดใช้งาน
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted">{a.createdAt}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <IconAction label="ตั้งรหัสผ่านใหม่" onClick={() => setResetting(a)}>
                          <KeyRound className="size-[18px]" />
                        </IconAction>
                        <IconAction label="แก้ไข" onClick={() => openEdit(a)}>
                          <Pencil className="size-[18px]" />
                        </IconAction>
                        <IconAction label="ลบ" onClick={() => setDeleting(a)}>
                          <Trash2 className="size-[18px]" />
                        </IconAction>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 border-t border-line px-6 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-faint">
              <ScanFace className="size-6" />
            </span>
            <p className="text-[15px] font-semibold text-ink-strong">ยังไม่มีบัญชีจุดสแกน</p>
            <p className="text-[13.5px] text-muted">เพิ่มบัญชีเพื่อใช้ล็อกอินที่หน้าจอสแกนใบหน้า</p>
          </div>
        )}
      </div>

      <KioskAccountDialog open={dialogOpen} account={editing} onClose={() => setDialogOpen(false)} onSaved={handleSaved} />

      {resetting && (
        <ResetPasswordDialog
          open
          accountId={resetting.id}
          accountEmail={resetting.email}
          onClose={() => setResetting(null)}
          onDone={(r) => {
            setResetting(null);
            if (r.ok) toast.success(r.message ?? "ตั้งรหัสผ่านใหม่แล้ว");
            else toast.error(r.message ?? "ไม่สำเร็จ");
          }}
        />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบบัญชีจุดสแกน</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `ต้องการลบบัญชี “${deleting.email}” ใช่หรือไม่? บัญชีนี้จะเข้าใช้งานหน้าสแกนไม่ได้อีก` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletePending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} disabled={isDeletePending} className="bg-destructive text-white hover:bg-destructive/90">
              {isDeletePending ? "กำลังลบ…" : "ลบบัญชี"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }): React.ReactNode {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} onClick={onClick} className="size-8 text-muted hover:text-ink">
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
