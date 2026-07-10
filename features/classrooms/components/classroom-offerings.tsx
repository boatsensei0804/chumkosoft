"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

  function handleSaved(): void {
    setDialogOpen(false);
    toast.success("เพิ่มรายวิชาให้ห้องเรียบร้อย");
    router.refresh();
  }

  function confirmRemove(): void {
    if (!removing) return;
    startRemove(async () => {
      const result = await deleteOfferingAction(removing.id);
      if (result.ok) toast.success(result.message ?? "นำออกแล้ว");
      else toast.error(result.message ?? "ทำรายการไม่สำเร็จ");
      setRemoving(null);
      if (result.ok) router.refresh();
    });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <SectionCard
        title="รายวิชาที่เรียน"
        caption={`${offerings.length.toLocaleString("th-TH")} วิชา · ภาคเรียนปัจจุบัน`}
        action={
          <Button variant="ghost" size="sm" onClick={() => setDialogOpen(true)} className="text-brand-ink">
            <Plus className="size-4" /> เพิ่มรายวิชา
          </Button>
        }
        bodyClassName="p-0"
      >
        {offerings.length > 0 ? (
          <div className="overflow-x-auto">
            <Table className="min-w-[520px]">
              <TableHeader>
                <TableRow>
                  <TableHead>รายวิชา</TableHead>
                  <TableHead>ผู้สอน</TableHead>
                  <TableHead>ห้อง</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offerings.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <p className="text-[13.5px] font-semibold text-ink-strong">{o.courseName}</p>
                      <p className="tabular text-[12px] text-muted">
                        {o.courseCode} · {o.periodsPerWeek} คาบ/สัปดาห์
                      </p>
                    </TableCell>
                    <TableCell className="text-[13px] text-ink">{o.teacher}</TableCell>
                    <TableCell className="text-[13px] text-muted">{o.room}</TableCell>
                    <TableCell className="text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8 text-muted hover:text-ink" aria-label={`นำ ${o.courseName} ออก`} onClick={() => setRemoving(o)}>
                            <Trash2 className="size-[18px]" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>นำออกจากห้อง</TooltipContent>
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
      </SectionCard>
    </TooltipProvider>
  );
}
