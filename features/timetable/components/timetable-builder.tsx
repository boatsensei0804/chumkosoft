"use client";

import { useMemo, useState, useTransition } from "react";
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
import { Info, Clock, GraduationCap, Users } from "lucide-react";
import ContextBar from "./context-bar";
import Palette from "./palette";
import Grid from "./grid";
import SlotBlock from "./slot-block";
import OfferingFormDialog from "@/features/classrooms/components/offering-form-dialog";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { checkConflict } from "../conflicts";
import { placeSlotAction, moveSlotAction, removeSlotAction } from "@/app/dashboard/timetable/actions";
import { deleteOfferingAction } from "@/features/classrooms/offering-actions";
import type { ConflictResult, ContextOption, DayInfo, ExternalBusy, Offering, PeriodRow, PlacedSlot } from "../types";
import type { OfferingOptions } from "@/features/classrooms/types";
import type { ScheduleOverviewData } from "../types";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

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
  externalBusy: ExternalBusy[];
  overview: ScheduleOverviewData;
}

export default function TimetableBuilder({
  context,
  terms,
  classrooms,
  offeringOptions,
  days,
  periods,
  offerings,
  externalBusy,
  overview,
}: TimetableBuilderProps): React.ReactNode {
  const router = useRouter();
  const [editorMode, setEditorMode] = useState<"classroom" | "teacher">("classroom");
  const [teacherId, setTeacherId] = useState(overview.teachers[0]?.id ?? "");
  const [slots, setSlots] = useState<PlacedSlot[]>(() => overview.slots.map(({ id, offeringId, day, periodId }) => ({ id, offeringId, day, periodId })));
  const [active, setActive] = useState<DragData | null>(null);
  const [saving, setSaving] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [removingOffering, setRemovingOffering] = useState<Offering | null>(null);
  const [isRemoving, startRemove] = useTransition();

  // Switch the board's term/classroom by driving URL search params; the server
  // component re-renders with the selected context's real offerings and slots.
  function changeContext(next: { term?: string; classroom?: string }): void {
    const term = next.term ?? context?.termId ?? "";
    const classroom = next.term ? "" : next.classroom ?? context?.classroomId ?? "";
    const params = new URLSearchParams({ view: "edit" });
    if (term) params.set("term", term);
    if (classroom) params.set("classroom", classroom);
    router.push(`/dashboard/timetable?${params.toString()}`);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const allOfferingsById = useMemo(() => new Map(overview.offerings.map((o) => [o.id, o])), [overview.offerings]);
  const visibleOfferings = useMemo(
    () => editorMode === "classroom" ? offerings : overview.offerings.filter((offering) => offering.teacherId === teacherId),
    [editorMode, offerings, overview.offerings, teacherId],
  );
  const visibleOfferingsById = useMemo(() => new Map(visibleOfferings.map((o) => [o.id, o])), [visibleOfferings]);
  const visibleSlots = useMemo(() => slots.filter((slot) => {
    const offering = allOfferingsById.get(slot.offeringId);
    return editorMode === "classroom" ? offering?.classroomId === context?.classroomId : offering?.teacherId === teacherId;
  }), [slots, allOfferingsById, editorMode, context?.classroomId, teacherId]);
  const activeExternalBusy = useMemo<ExternalBusy[]>(() => {
    if (editorMode === "classroom") return externalBusy;
    const map = new Map<string, ExternalBusy>();
    for (const slot of overview.slots) {
      if (slot.teacherId === teacherId) continue;
      const key = `${slot.day}:${slot.periodId}`;
      const busy = map.get(key) ?? { day: slot.day, periodId: slot.periodId, classroomIds: [], teacherIds: [], roomIds: [] };
      if (!busy.classroomIds?.includes(slot.classroomId)) busy.classroomIds?.push(slot.classroomId);
      if (!busy.teacherIds.includes(slot.teacherId)) busy.teacherIds.push(slot.teacherId);
      if (!busy.roomIds.includes(slot.roomId)) busy.roomIds.push(slot.roomId);
      map.set(key, busy);
    }
    return [...map.values()];
  }, [editorMode, externalBusy, overview.slots, teacherId]);
  const periodsById = useMemo(() => new Map(periods.map((p) => [p.id, p])), [periods]);
  const daysByKey = useMemo(() => new Map(days.map((d) => [d.key, d])), [days]);

  const slotsByCell = useMemo(() => {
    const map = new Map<string, PlacedSlot>();
    for (const s of visibleSlots) map.set(`${s.day}:${s.periodId}`, s);
    return map;
  }, [visibleSlots]);

  const remainingById = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of visibleOfferings) map.set(o.id, o.periodsPerWeek);
    for (const s of visibleSlots) map.set(s.offeringId, (map.get(s.offeringId) ?? 0) - 1);
    return map;
  }, [visibleOfferings, visibleSlots]);

  const totalRequired = useMemo(() => visibleOfferings.reduce((n, o) => n + o.periodsPerWeek, 0), [visibleOfferings]);

  const conflictFor = (day: string, periodId: string): ConflictResult | undefined => {
    if (!active) return undefined;
    const offering = visibleOfferingsById.get(active.offeringId);
    if (!offering) return undefined;
    return checkConflict({
      offering,
      day: day as PlacedSlot["day"],
      periodId,
      slots: visibleSlots,
      offeringsById: visibleOfferingsById,
      externalBusy: activeExternalBusy,
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
    const offering = visibleOfferingsById.get(data.offeringId);
    if (!over || !offering) return;

    // Instant client-side check for snappy feedback.
    const res = checkConflict({
      offering,
      day: over.day,
      periodId: over.periodId,
      slots: visibleSlots,
      offeringsById: visibleOfferingsById,
      externalBusy: activeExternalBusy,
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
      const offering = removed ? allOfferingsById.get(removed.offeringId) : undefined;
      if (offering) toast.success(`เอา ${offering.courseName} ออกแล้ว`);
    } finally {
      setSaving(false);
    }
  }

  // Delete a whole subject from this class — cascades to its placed periods.
  function confirmRemoveOffering(): void {
    const offering = removingOffering;
    if (!offering) return;
    startRemove(async () => {
      const result = await deleteOfferingAction(offering.id);
      if (result.ok) {
        setSlots((prev) => prev.filter((s) => s.offeringId !== offering.id));
        toast.success(result.message ?? `ลบ ${offering.courseName} แล้ว`);
        router.refresh();
      } else {
        toast.error(result.message ?? "ลบไม่สำเร็จ");
      }
      setRemovingOffering(null);
    });
  }

  const activeOffering = active ? visibleOfferingsById.get(active.offeringId) : undefined;
  const placedForRemoving = removingOffering ? slots.filter((s) => s.offeringId === removingOffering.id).length : 0;
  const teacherMode = editorMode === "teacher";

  return (
    <div className="flex flex-col gap-4">
      <ContextBar
        terms={terms}
        termId={context?.termId ?? ""}
        onTermChange={(v) => changeContext({ term: v })}
        classrooms={classrooms}
        classroomId={context?.classroomId ?? ""}
        onClassroomChange={(v) => changeContext({ classroom: v })}
        placed={visibleSlots.length}
        total={totalRequired}
        showClassroom={!teacherMode}
      />

      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-line bg-bg px-4 py-3">
        <div>
          <p className="text-xs font-medium text-muted">จัดตารางโดยเลือกมุมมอง</p>
          <div role="tablist" aria-label="จัดตารางตามห้องหรือครู" className="mt-2 inline-flex gap-1 rounded-lg bg-surface-2 p-1">
            <button type="button" role="tab" aria-selected={!teacherMode} onClick={() => setEditorMode("classroom")} className={cn("inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-semibold", !teacherMode ? "bg-bg text-brand-ink shadow-sm" : "text-muted hover:text-ink-strong")}>
              <GraduationCap className="size-4" /> ตามชั้นเรียน
            </button>
            <button type="button" role="tab" aria-selected={teacherMode} onClick={() => setEditorMode("teacher")} className={cn("inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-semibold", teacherMode ? "bg-bg text-brand-ink shadow-sm" : "text-muted hover:text-ink-strong")}>
              <Users className="size-4" /> ตามครู
            </button>
          </div>
        </div>
        {teacherMode && (
          <label className="flex min-w-[220px] flex-col gap-1.5 text-xs font-medium text-muted">
            เลือกครูผู้สอน
            <NativeSelect value={teacherId} onChange={(event) => setTeacherId(event.target.value)} disabled={overview.teachers.length === 0} className="bg-bg font-semibold">
              {overview.teachers.length === 0 && <option value="">ยังไม่มีครูที่ได้รับมอบหมายวิชา</option>}
              {overview.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
            </NativeSelect>
          </label>
        )}
      </div>

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
            offerings={visibleOfferings}
            remainingById={remainingById}
            onAddSubject={() => setAssignOpen(true)}
            canAddSubject={Boolean(context) && !teacherMode}
            onRemoveSubject={setRemovingOffering}
            allowManage={!teacherMode}
            title={teacherMode ? "วิชาที่ได้รับมอบหมาย" : "รายวิชาประจำห้อง"}
            description={teacherMode ? "ลากคาบของครูไปจัดในตาราง" : "ลากวิชาจากห้องนี้ลงในช่องคาบ"}
            emptyMessage={teacherMode ? "ครูคนนี้ยังไม่มีวิชาที่ได้รับมอบหมาย" : "ห้องนี้ยังไม่มีรายวิชา"}
          />
          <Grid
            days={days}
            periods={periods}
            slotsByCell={slotsByCell}
            offeringsById={visibleOfferingsById}
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

      {context && !teacherMode && (
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

      <ConfirmDialog
        open={!teacherMode && removingOffering !== null}
        title="ลบรายวิชาออกจากห้อง"
        message={
          removingOffering
            ? `ต้องการลบ “${removingOffering.courseName}” (${removingOffering.teacherName}) ออกจากห้องนี้ใช่หรือไม่?${placedForRemoving > 0 ? ` จะนำ ${placedForRemoving} คาบที่จัดไว้ในตารางออกด้วย` : ""}`
            : ""
        }
        confirmLabel="ลบรายวิชา"
        destructive
        pending={isRemoving}
        onConfirm={confirmRemoveOffering}
        onClose={() => setRemovingOffering(null)}
      />
    </div>
  );
}
