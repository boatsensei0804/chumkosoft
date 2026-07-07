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
import SectionCard from "@/features/dashboard/components/section-card";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import OfferingFormDialog from "./offering-form-dialog";
import { deleteOfferingAction } from "@/features/classrooms/offering-actions";
import type { OfferingRow, OfferingOptions } from "@/features/classrooms/types";

interface ClassroomOfferingsProps {
  classroomId: string;
  offerings: OfferingRow[];
  options: OfferingOptions;
}

export default function ClassroomOfferings({ classroomId, offerings, options }: ClassroomOfferingsProps): React.ReactNode {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removing, setRemoving] = useState<OfferingRow | null>(null);
  const [isPending, startRemove] = useTransition();
  const [toast, setToast] = useState<{ severity: "success" | "error"; message: string } | null>(null);

  function handleSaved(): void {
    setDialogOpen(false);
    setToast({ severity: "success", message: "เพิ่มรายวิชาให้ห้องเรียบร้อย" });
    router.refresh();
  }

  function confirmRemove(): void {
    if (!removing) return;
    startRemove(async () => {
      const result = await deleteOfferingAction(removing.id);
      setToast({ severity: result.ok ? "success" : "error", message: result.message ?? (result.ok ? "นำออกแล้ว" : "ทำรายการไม่สำเร็จ") });
      setRemoving(null);
      if (result.ok) router.refresh();
    });
  }

  return (
    <SectionCard
      title="รายวิชาที่เรียน"
      caption={`${offerings.length.toLocaleString("th-TH")} วิชา · ภาคเรียนปัจจุบัน`}
      action={
        <Button variant="text" onClick={() => setDialogOpen(true)} startIcon={<Icon name="add" sx={{ fontSize: 17 }} />} sx={{ color: "var(--brand-ink)", fontSize: 13 }}>
          เพิ่มรายวิชา
        </Button>
      }
      bodyClassName="p-0"
    >
      {offerings.length > 0 ? (
        <div className="overflow-x-auto">
          <Table sx={{ minWidth: 520 }}>
            <TableHead>
              <TableRow>
                <TableCell>รายวิชา</TableCell>
                <TableCell>ผู้สอน</TableCell>
                <TableCell>ห้อง</TableCell>
                <TableCell align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {offerings.map((o) => (
                <TableRow key={o.id} sx={{ "&:last-child td": { borderBottom: 0 } }}>
                  <TableCell>
                    <p className="text-[13.5px] font-semibold text-ink-strong">{o.courseName}</p>
                    <p className="tabular text-[12px] text-muted">
                      {o.courseCode} · {o.periodsPerWeek} คาบ/สัปดาห์
                    </p>
                  </TableCell>
                  <TableCell>
                    <span className="text-[13px] text-ink">{o.teacher}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[13px] text-muted">{o.room}</span>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="นำออกจากห้อง" arrow>
                      <IconButton size="small" aria-label={`นำ ${o.courseName} ออก`} onClick={() => setRemoving(o)}>
                        <Icon name="delete" sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="px-5 py-10 text-center text-[13.5px] text-muted">ยังไม่มีรายวิชาที่เปิดให้ห้องนี้ — กด “เพิ่มรายวิชา” เพื่อกำหนดวิชา ผู้สอน และห้อง</p>
      )}

      <OfferingFormDialog open={dialogOpen} classroomId={classroomId} options={options} onClose={() => setDialogOpen(false)} onSaved={handleSaved} />

      <ConfirmDialog
        open={removing !== null}
        title="นำรายวิชาออกจากห้อง"
        message={removing ? `ต้องการนำ “${removing.courseName}” ออกจากห้องนี้ใช่หรือไม่?` : ""}
        confirmLabel="นำออก"
        destructive
        pending={isPending}
        onConfirm={confirmRemove}
        onClose={() => setRemoving(null)}
      />

      <Snackbar open={toast !== null} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: "var(--radius-sm)" }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </SectionCard>
  );
}
