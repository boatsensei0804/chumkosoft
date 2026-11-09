import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatTone = "default" | "brand" | "success" | "warning" | "danger";

export interface StatItem {
  label: string;
  value: string | number;
  /** Small caption under the value (e.g. a unit or context). */
  hint?: string;
  icon?: LucideIcon;
  tone?: StatTone;
}

const toneChip: Record<StatTone, string> = {
  default: "bg-surface-2 text-muted",
  brand: "bg-brand-soft text-brand-strong",
  success: "bg-success-soft text-[oklch(0.42_0.1_152)]",
  warning: "bg-warning-soft text-[oklch(0.5_0.13_60)]",
  danger: "bg-danger-soft text-danger",
};

const toneValue: Record<StatTone, string> = {
  default: "text-ink-strong",
  brand: "text-ink-strong",
  success: "text-ink-strong",
  warning: "text-[oklch(0.5_0.13_60)]",
  danger: "text-danger",
};

function formatValue(value: string | number): string {
  return typeof value === "number" ? value.toLocaleString("th-TH") : value;
}

/**
 * A compact status strip for the top of a list/management page: one card per
 * key figure, so staff read the state of the data at a glance. Shares the visual
 * language of the dashboard's SummaryFigures but lighter (no deltas). Renders
 * nothing when there are no items.
 */
export default function StatStrip({ items, className }: { items: StatItem[]; className?: string }): React.ReactNode {
  if (items.length === 0) return null;
  return (
    <section
      aria-label="สรุปสถานะข้อมูล"
      className={cn("mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4", className)}
    >
      {items.map((item) => {
        const tone = item.tone ?? "default";
        const Icon = item.icon;
        return (
          <div key={item.label} className="flex min-w-0 flex-col gap-2 rounded-[18px] border border-line bg-bg p-3.5 shadow-sm sm:p-4">
            <div className="flex items-center gap-2">
              {Icon && (
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-md", toneChip[tone])} aria-hidden="true">
                  <Icon className="size-3.5" />
                </span>
              )}
              <p className="truncate text-[12px] font-medium text-muted">{item.label}</p>
            </div>
            <div className="flex items-baseline gap-1.5 pl-8">
              <span className={cn("tabular text-[21px] font-semibold leading-none tracking-tight", toneValue[tone])}>{formatValue(item.value)}</span>
              {item.hint && <span className="text-[11.5px] font-medium text-faint">{item.hint}</span>}
            </div>
          </div>
        );
      })}
    </section>
  );
}
