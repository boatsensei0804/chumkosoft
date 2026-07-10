import { X } from "lucide-react";
import { subjectColors } from "../data";
import type { Offering } from "../types";

interface SlotBlockProps {
  offering: Offering;
  variant?: "cell" | "overlay";
  onRemove?: () => void;
}

export default function SlotBlock({ offering, variant = "cell", onRemove }: SlotBlockProps): React.ReactNode {
  const c = subjectColors[offering.color];
  return (
    <div
      className="group/slot relative flex h-full w-full flex-col gap-0.5 overflow-hidden rounded-[10px] px-2.5 py-1.5 text-left"
      style={{
        backgroundColor: c.bg,
        color: c.ink,
        border: `1px solid color-mix(in oklch, ${c.bar} 32%, transparent)`,
        boxShadow: variant === "overlay" ? "var(--shadow-lg)" : "none",
        cursor: variant === "overlay" ? "grabbing" : "grab",
      }}
    >
      <p className="truncate pr-4 text-[12.5px] font-bold leading-tight">{offering.courseName}</p>
      <p className="truncate text-[11px] font-medium opacity-80">{offering.teacherName}</p>
      <p className="truncate text-[10.5px] opacity-70">{offering.roomName}</p>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`เอา ${offering.courseName} ออกจากตาราง`}
          className="absolute right-0.5 top-0.5 grid size-5 place-items-center rounded opacity-0 transition-opacity hover:bg-black/10 focus-visible:opacity-100 group-hover/slot:opacity-100"
          style={{ color: c.ink }}
        >
          <X className="size-[15px]" />
        </button>
      )}
    </div>
  );
}
