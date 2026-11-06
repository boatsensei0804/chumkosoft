import { GraduationCap, Users, BookOpen, ClipboardList, TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import type { Figure } from "../types";

function formatValue(value: number): string {
  return value.toLocaleString("th-TH");
}

interface FigureStyle {
  icon: LucideIcon;
  bg: string;
  fg: string;
}

/**
 * Per-figure glyph + hue so the four headline cards read as distinct facts at a
 * glance rather than one repeated template. Keyed by the stable figure key from
 * the service; falls back to a neutral brand treatment for unknown keys.
 */
const figureStyles: Record<string, FigureStyle> = {
  students: { icon: GraduationCap, bg: "var(--brand-soft)", fg: "var(--brand-strong)" },
  teachers: { icon: Users, bg: "var(--accent-soft)", fg: "oklch(0.45 0.11 220)" },
  courses: { icon: BookOpen, bg: "var(--success-soft)", fg: "oklch(0.42 0.1 152)" },
  pending: { icon: ClipboardList, bg: "var(--warning-soft)", fg: "oklch(0.5 0.13 60)" },
};

const fallbackStyle: FigureStyle = { icon: TrendingUp, bg: "var(--brand-soft)", fg: "var(--brand-strong)" };

interface SummaryFiguresProps {
  figures: Figure[];
}

export default function SummaryFigures({ figures }: SummaryFiguresProps): React.ReactNode {
  return (
    <section aria-label="สรุปภาพรวม" className="grid grid-cols-1 overflow-hidden rounded-xl border border-line bg-bg sm:grid-cols-2 lg:grid-cols-4">
      {figures.map((figure) => {
        const style = figureStyles[figure.key] ?? fallbackStyle;
        const FigureIcon = style.icon;
        const up = figure.deltaPct >= 0;
        const TrendIcon = up ? TrendingUp : TrendingDown;
        // A pending backlog is an action item, not a neutral stat — flag it.
        const needsAttention = figure.key === "pending" && figure.value > 0;
        return (
          <div
            key={figure.key}
            className="flex min-w-0 items-start gap-3 border-b border-r border-line p-4 sm:p-4"
            style={{ backgroundColor: needsAttention ? "var(--warning-soft)" : "var(--bg)" }}
          >
            <span
              className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg"
              style={{ backgroundColor: style.bg, color: style.fg }}
              aria-hidden="true"
            >
              <FigureIcon className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-muted">{figure.label}</p>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span
                  className="tabular text-[24px] font-semibold leading-none tracking-tight"
                  style={{ color: needsAttention ? "oklch(0.5 0.13 60)" : "var(--ink-strong)" }}
                >
                  {formatValue(figure.value)}
                </span>
                {figure.unit && <span className="text-[13px] font-medium text-faint">{figure.unit}</span>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {figure.deltaPct !== 0 && (
                  <span
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-semibold tabular"
                    style={{
                      backgroundColor: up ? "var(--success-soft)" : "var(--danger-soft)",
                      color: up ? "oklch(0.42 0.1 152)" : "oklch(0.48 0.16 25)",
                    }}
                  >
                    <TrendIcon className="size-[15px]" />
                    {up ? "+" : ""}
                    {figure.deltaPct}%
                  </span>
                )}
                <span className="text-[12px] text-faint">{figure.caption}</span>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
