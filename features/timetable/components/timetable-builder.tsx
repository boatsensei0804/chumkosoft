"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { Info, Clock } from "lucide-react";
import ContextBar from "./context-bar";
import Palette from "./palette";
import Grid from "./grid";
import SlotBlock from "./slot-block";
import OfferingFormDialog from "@/features/classrooms/components/offering-form-dialog";
import { checkConflict } from "../conflicts";
import { placeSlotAction, moveSlotAction, removeSlotAction } from "@/app/dashboard/timetable/actions";
import type { ConflictResult, ContextOption, DayInfo, ExternalBusy, Offering, PeriodRow, PlacedSlot } from "../types";
import type { OfferingOptions } from "@/features/classrooms/types";

interface DragData {
  type: "offering" | "slot";
  offeringId: string;
  slotId?: string;
}

interface TimetableBuilderProps {
  context: { termId: string; termName: string; classroomId: string; classroomCode: string } | null;
  terms: ContextOption[];
  classrooms: ContextOption[];
  offeringOptions: OfferingOptions;
  days: DayInfo[];
  periods: PeriodRow[];
  offerings: Offering[];
  initialSlots: PlacedSlot[];
  externalBusy: ExternalBusy[];
}

export default function TimetableBuilder({
  context,
  terms,
  classrooms,
  offeringOptions,
  days,
  periods,
  offerings,
  initialSlots,
  externalBusy,
}: TimetableBuilderProps): React.ReactNode {
  const router = useRouter();
  const [slots, setSlots] = useState<PlacedSlot[]>(() => initialSlots.map((s) => ({ ...s })));
  const [active, setActive] = useState<DragData | null>(null);
  const [saving, setSaving] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  // Switch the board's term/classroom by driving URL search params; the server
  // component re-renders with the selected context's real offerings and slots.
  function changeContext(next: { term?: string; classroom?: string }): void {
    const term = next.term ?? context?.termId ?? "";
    const classroom = next.term ? "" : next.classroom ?? context?.classroomId ?? "";
    const params = new URLSearchParams();
    if (term) params.set("term", term);
    if (classroom) params.set("classroom", classroom);
    router.push(`/dashboard/timetable?${params.toString()}`);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const offeringsById = useMemo(() => new Map(offerings.map((o) => [o.id, o])), [offerings]);
  const periodsById = useMemo(() => new Map(periods.map((p) => [p.id, p])), [periods]);
  const daysByKey = useMemo(() => new Map(days.map((d) => [d.key, d])), [days]);

  const slotsByCell = useMemo(() => {
    const map = new Map<string, PlacedSlot>();
    for (const s of slots) map.set(`${s.day}:${s.periodId}`, s);
    return map;
  }, [slots]);

  const remainingById = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of offerings) map.set(o.id, o.periodsPerWeek);
    for (const s of slots) map.set(s.offeringId, (map.get(s.offeringId) ?? 0) - 1);
    return map;
  }, [offerings, slots]);

  const totalRequired = useMemo(() => offerings.reduce((n, o) => n + o.periodsPerWeek, 0), [offerings]);

  const conflictFor = (day: string, periodId: string): ConflictResult | undefined => {
    if (!active) return undefined;
    const offering = offeringsById.get(active.offeringId);
    if (!offering) return undefined;
    return checkConflict({
      offering,
      day: day as PlacedSlot["day"],
      periodId,
      slots,
      offeringsById,
      externalBusy,
      ignoreSlotId: active.slotId,
    });
  };

  function handleDragStart(e: DragStartEvent): void {
    setActive((e.active.data.current as DragData) ?? null);
  }

  async function handleDragEnd(e: DragEndEvent): Promise<void> {
    const data = e.active.data.current as DragData | undefined;
    setActive(null);
    if (!data || !e.over) return;

    const over = e.over.data.current as { day: PlacedSlot["day"]; periodId: string } | undefined;
    const offering = offeringsById.get(data.offeringId);
    if (!over || !offering) return;

    // Instant client-side check for snappy feedback.
    const res = checkConflict({
      offering,
      day: over.day,
      periodId: over.periodId,
      slots,
      offeringsById,
      externalBusy,
      ignoreSlotId: data.slotId,
    });
    if (!res.ok) {
      toast.error(res.reason ?? "วางไม่ได้");
      return;
    }
    if (data.type !== "slot" && (remainingById.get(offering.id) ?? 0) <= 0) {
      toast.error(`${offering.courseName} จัดครบตามจำนวนคาบแล้ว`);
      return;
    }

    // Persist — the server re-validates conflicts authoritatively.
    setSaving(true);
    try {
      const result =
        data.type === "slot" && data.slotId
          ? await moveSlotAction(data.slotId, over.day, over.periodId)
          : await placeSlotAction(offering.id, over.day, over.periodId);

      if (!result.ok) {
        toast.error(result.reason ?? "บันทึกไม่สำเร็จ");
        return;
      }

      if (data.type === "slot" && data.slotId) {
        setSlots((prev) => prev.map((s) => (s.id === data.slotId ? { ...s, day: over.day, periodId: over.periodId } : s)));
      } else if (result.slot) {
        setSlots((prev) => [...prev, result.slot!]);
      }

      const dayLabel = daysByKey.get(over.day)?.label ?? "";
      const periodLabel = periodsById.get(over.periodId)?.label ?? "";
      toast.success(`บันทึก ${offering.courseName} · ${dayLabel} ${periodLabel}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(slotId: string): Promise<void> {
    const removed = slots.find((s) => s.id === slotId);
    setSaving(true);
    try {
      const result = await removeSlotAction(slotId);
      if (!result.ok) {
        toast.error(result.reason ?? "ลบไม่สำเร็จ");
        return;
      }
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
      const offering = removed ? offeringsById.get(removed.offeringId) : undefined;
      if (offering) toast.success(`เอา ${offering.courseName} ออกแล้ว`);
    } finally {
      setSaving(false);
    }
  }

  const activeOffering = active ? offeringsById.get(active.offeringId) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <ContextBar
        terms={terms}
        termId={context?.termId ?? ""}
        onTermChange={(v) => changeContext({ term: v })}
        classrooms={classrooms}
        classroomId={context?.classroomId ?? ""}
        onClassroomChange={(v) => changeContext({ classroom: v })}
        placed={slots.length}
        total={totalRequired}
      />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-[12px] bg-brand-softer px-4 py-2.5 text-[12.5px] text-muted">
        <span className="inline-flex items-center gap-1.5 font-medium text-ink">
          <Info className="size-4 text-brand-strong" />
          ลากวิชาจากด้านซ้ายมาวางในช่องคาบ — บันทึกลงฐานข้อมูลอัตโนมัติ
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded border-[1.5px] border-dashed border-brand-strong bg-brand-soft" />
          วางได้
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded border-[1.5px] border-dashed border-[color-mix(in_oklch,var(--danger)_55%,transparent)] bg-danger-soft" />
          ชนคาบ (ครู/ห้อง/ชั้นซ้ำ)
        </span>
        {saving && (
          <span className="ml-auto inline-flex items-center gap-1.5 font-medium text-brand-ink">
            <Clock className="size-[15px]" />
            กำลังบันทึก…
          </span>
        )}
      </div>

      <DndContext id="timetable-dnd" sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActive(null)}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr] lg:items-start">
          <Palette
            offerings={offerings}
            remainingById={remainingById}
            onAddSubject={() => setAssignOpen(true)}
            canAddSubject={Boolean(context)}
          />
          <Grid
            days={days}
            periods={periods}
            slotsByCell={slotsByCell}
            offeringsById={offeringsById}
            dragging={active !== null}
            conflictFor={conflictFor}
            onRemove={handleRemove}
          />
        </div>

        <DragOverlay dropAnimation={null}>
          {activeOffering ? (
            <div style={{ width: 200, height: 62 }}>
              <SlotBlock offering={activeOffering} variant="overlay" />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {context && (
        <OfferingFormDialog
          open={assignOpen}
          classroomId={context.classroomId}
          termId={context.termId}
          options={offeringOptions}
          onClose={() => setAssignOpen(false)}
          onSaved={() => {
            setAssignOpen(false);
            toast.success("มอบหมายวิชาให้ห้องเรียบร้อย ลากวิชาลงตารางได้เลย");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
