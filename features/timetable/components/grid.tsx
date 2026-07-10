"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { X, Clock } from "lucide-react";
import SlotBlock from "./slot-block";
import type { ConflictResult, DayInfo, Offering, PeriodRow, PlacedSlot } from "../types";

interface DraggableSlotProps {
  slot: PlacedSlot;
  offering: Offering;
  onRemove: () => void;
}

function DraggableSlot({ slot, offering, onRemove }: DraggableSlotProps): React.ReactNode {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `slot:${slot.id}`,
    data: { type: "slot", slotId: slot.id, offeringId: offering.id },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="h-full w-full"
      style={{ opacity: isDragging ? 0.3 : 1, touchAction: "none" }}
    >
      <SlotBlock offering={offering} onRemove={onRemove} />
    </div>
  );
}

interface CellProps {
  day: DayInfo;
  period: PeriodRow;
  slot?: PlacedSlot;
  offering?: Offering;
  dragging: boolean;
  conflict?: ConflictResult;
  onRemove: (slotId: string) => void;
}

function Cell({ day, period, slot, offering, dragging, conflict, onRemove }: CellProps): React.ReactNode {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell:${day.key}:${period.id}`,
    data: { day: day.key, periodId: period.id },
  });

  const showValid = dragging && conflict?.ok;
  const showInvalid = dragging && conflict && !conflict.ok;

  let background = "var(--bg)";
  let outline = "none";
  if (showValid) {
    background = isOver ? "var(--brand-soft)" : "color-mix(in oklch, var(--brand-soft) 55%, var(--bg))";
    outline = isOver ? "2px solid var(--brand)" : "1.5px dashed var(--brand-strong)";
  } else if (showInvalid) {
    background = isOver ? "var(--danger-soft)" : "color-mix(in oklch, var(--danger-soft) 45%, var(--bg))";
    outline = isOver ? "2px solid var(--danger)" : "1.5px dashed color-mix(in oklch, var(--danger) 55%, transparent)";
  }

  return (
    <div
      ref={setNodeRef}
      className="relative p-1"
      style={{ minHeight: 66, background, outline, outlineOffset: "-2px", transition: "background-color 120ms ease" }}
    >
      {slot && offering ? (
        <DraggableSlot slot={slot} offering={offering} onRemove={() => onRemove(slot.id)} />
      ) : (
        showInvalid &&
        isOver && (
          <span className="grid h-full w-full place-items-center text-danger" aria-hidden="true">
            <X className="size-5" />
          </span>
        )
      )}
    </div>
  );
}

interface GridProps {
  days: DayInfo[];
  periods: PeriodRow[];
  slotsByCell: Map<string, PlacedSlot>;
  offeringsById: Map<string, Offering>;
  dragging: boolean;
  conflictFor: (day: string, periodId: string) => ConflictResult | undefined;
  onRemove: (slotId: string) => void;
}

export default function Grid({
  days,
  periods,
  slotsByCell,
  offeringsById,
  dragging,
  conflictFor,
  onRemove,
}: GridProps): React.ReactNode {
  return (
    <div
      className="overflow-hidden rounded-[16px]"
      style={{ backgroundColor: "var(--line)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}
    >
      <div className="min-w-[720px]">
        <div className="grid gap-px" style={{ gridTemplateColumns: "78px repeat(5, minmax(120px, 1fr))" }}>
          {/* Header */}
          <div className="px-2 py-2.5 text-[11px] font-semibold" style={{ backgroundColor: "var(--surface-2)", color: "var(--faint)" }}>
            คาบ
          </div>
          {days.map((d) => (
            <div key={d.key} className="px-2 py-2.5 text-center" style={{ backgroundColor: "var(--surface-2)" }}>
              <span className="text-[13px] font-bold text-ink-strong">{d.label}</span>
            </div>
          ))}

          {/* Rows */}
          {periods.map((p) =>
            p.kind === "break" ? (
              <div
                key={p.id}
                className="col-span-6 flex items-center justify-center gap-2 py-1.5 text-[12px] font-medium"
                style={{ backgroundColor: "var(--surface-sunken)", color: "var(--muted)" }}
              >
                <Clock className="size-[15px] text-faint" />
                {p.label} · {p.start}–{p.end}
              </div>
            ) : (
              <FragmentRow key={p.id}>
                <div className="flex flex-col justify-center px-2 py-1" style={{ backgroundColor: "var(--surface)" }}>
                  <span className="tabular text-[12px] font-bold text-ink">{p.label}</span>
                  <span className="tabular text-[10.5px] text-faint">{p.start}–{p.end}</span>
                </div>
                {days.map((d) => {
                  const key = `${d.key}:${p.id}`;
                  const slot = slotsByCell.get(key);
                  return (
                    <Cell
                      key={key}
                      day={d}
                      period={p}
                      slot={slot}
                      offering={slot ? offeringsById.get(slot.offeringId) : undefined}
                      dragging={dragging}
                      conflict={dragging ? conflictFor(d.key, p.id) : undefined}
                      onRemove={onRemove}
                    />
                  );
                })}
              </FragmentRow>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }): React.ReactNode {
  return <>{children}</>;
}
