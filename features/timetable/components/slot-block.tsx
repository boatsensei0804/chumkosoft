import IconButton from "@mui/material/IconButton";
import Icon from "@/features/dashboard/components/icon";
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
        <IconButton
          onClick={onRemove}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`เอา ${offering.courseName} ออกจากตาราง`}
          size="small"
          className="!absolute right-0.5 top-0.5 opacity-0 transition-opacity group-hover/slot:opacity-100 focus-visible:opacity-100"
          sx={{ padding: "2px", color: c.ink }}
        >
          <Icon name="close" sx={{ fontSize: 15 }} />
        </IconButton>
      )}
    </div>
  );
}
