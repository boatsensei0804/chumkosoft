"use client";

import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function RecordPreviewDialog({ open, title, subtitle, fields, onClose, onEdit }: {
  open: boolean;
  title: string;
  subtitle?: string;
  fields: { label: string; value: ReactNode }[];
  onClose: () => void;
  onEdit: () => void;
}): ReactNode {
  return <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl bg-bg sm:max-w-xl">
      <DialogHeader className="text-left"><DialogTitle>{title}</DialogTitle><DialogDescription>{subtitle ?? "รายละเอียดรายการ"}</DialogDescription></DialogHeader>
      <dl className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-2">{fields.map(({ label, value }) => <div key={label} className="rounded-xl bg-surface-2 p-3"><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-ink-strong">{value ?? "—"}</dd></div>)}</dl>
      <DialogFooter><Button variant="outline" onClick={onClose}>ปิด</Button><Button onClick={onEdit}>แก้ไขข้อมูล</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
