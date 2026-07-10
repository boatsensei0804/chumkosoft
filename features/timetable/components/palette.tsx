"use client";

import { useDraggable } from "@dnd-kit/core";
import { CheckCircle2, Plus, BookOpen } from "lucide-react";
import { subjectColors } from "../data";
import type { Offering } from "../types";

interface PaletteCardProps {
  offering: Offering;
  remaining: number;
}

function PaletteCard({ offering, remaining }: PaletteCardProps): React.ReactNode {
  const done = remaining <= 0;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `offering:${offering.id}`,
    disabled: done,
    data: { type: "offering", offeringId: offering.id },
  });
  const c = subjectColors[offering.color];

  return (
    <div
      ref={setNodeRef}
      {...(done ? {} : listeners)}
      {...attributes}
      role={done ? undefined : "button"}
      aria-label={done ? undefined : `ลากวิชา ${offering.courseName} ลงในตาราง เหลือ ${remaining} คาบ`}
      className="flex items-center gap-3 rounded-[12px] border p-2.5 transition-shadow"
      style={{
        backgroundColor: done ? "var(--surface-2)" : "var(--bg)",
        borderColor: "var(--line)",
        opacity: isDragging ? 0.4 : done ? 0.6 : 1,
        cursor: done ? "default" : "grab",
        boxShadow: isDragging ? "none" : "var(--shadow-sm)",
        touchAction: "none",
      }}
    >
      <span className="mt-0.5 h-9 w-1.5 shrink-0 self-stretch rounded-full" style={{ backgroundColor: c.bar }} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-ink-strong">{offering.courseName}</p>
        <p className="truncate text-[12px] text-muted">{offering.teacherName}</p>
        <p className="truncate text-[11.5px] text-faint">{offering.roomName}</p>
      </div>
      {done ? (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: "var(--success-soft)", color: "oklch(0.42 0.1 152)" }}>
          <CheckCircle2 className="size-3.5" />
          ครบ
        </span>
      ) : (
        <span className="tabular shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold" style={{ backgroundColor: c.bg, color: c.ink }}>
          เหลือ {remaining}
        </span>
      )}
    </div>
  );
}

interface PaletteProps {
  offerings: Offering[];
  remainingById: Map<string, number>;
  onAddSubject: () => void;
  canAddSubject: boolean;
}

export default function Palette({ offerings, remainingById, onAddSubject, canAddSubject }: PaletteProps): React.ReactNode {
  const remainingTotal = offerings.reduce((sum, o) => sum + Math.max(0, remainingById.get(o.id) ?? 0), 0);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-[16px]"
      style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
        <div>
          <h2 className="text-[14px] font-bold text-ink-strong">รายวิชา</h2>
          <p className="text-[12px] text-muted">ลากวิชาไปวางในช่องคาบเรียน</p>
        </div>
        <span
          className="tabular rounded-full px-2 py-0.5 text-[12px] font-semibold"
          style={{ backgroundColor: remainingTotal === 0 ? "var(--success-soft)" : "var(--brand-soft)", color: remainingTotal === 0 ? "oklch(0.42 0.1 152)" : "var(--brand-ink)" }}
        >
          {remainingTotal === 0 ? "จัดครบแล้ว" : `ค้าง ${remainingTotal} คาบ`}
        </span>
      </div>

      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={onAddSubject}
          disabled={!canAddSubject}
          className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed py-2 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderColor: "var(--brand)", color: "var(--brand-ink)", backgroundColor: "var(--brand-softer)" }}
        >
          <Plus className="size-[18px]" />
          มอบหมายวิชาให้ครู
        </button>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto p-3" style={{ maxHeight: "calc(100dvh - 320px)" }}>
        {offerings.length > 0 ? (
          offerings.map((o) => <PaletteCard key={o.id} offering={o} remaining={remainingById.get(o.id) ?? 0} />)
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <span className="grid size-10 place-items-center rounded-full" style={{ backgroundColor: "var(--surface-2)", color: "var(--faint)" }} aria-hidden="true">
              <BookOpen className="size-5" />
            </span>
            <p className="text-[13px] font-medium text-ink">ห้องนี้ยังไม่มีรายวิชา</p>
            <p className="text-[12px] text-muted">กด “มอบหมายวิชาให้ครู” เพื่อเพิ่มวิชาและผู้สอน แล้วจึงลากลงตาราง</p>
          </div>
        )}
      </div>
    </div>
  );
}
