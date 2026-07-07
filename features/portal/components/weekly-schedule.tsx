import Icon from "@/features/dashboard/components/icon";
import type { PortalOverview } from "@/features/portal/types";

/** Read-only weekly class schedule (ตารางเรียน) for the portal viewer. */
export default function WeeklySchedule({ overview }: { overview: PortalOverview }): React.ReactNode {
  const { days, periods } = overview;
  const gridCols = `92px repeat(${days.length}, minmax(120px, 1fr))`;

  return (
    <div
      className="overflow-x-auto rounded-[16px]"
      style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}
    >
      <div className="min-w-[720px]">
        {/* Header row: weekdays */}
        <div className="grid" style={{ gridTemplateColumns: gridCols, borderBottom: "1px solid var(--line)" }}>
          <div className="px-3 py-3 text-[12px] font-semibold uppercase tracking-wide text-faint">คาบ</div>
          {days.map((d) => (
            <div
              key={d.key}
              className="px-3 py-3 text-center text-[13px] font-semibold text-ink-strong"
              style={{ backgroundColor: "var(--surface-2)" }}
            >
              {d.label}
            </div>
          ))}
        </div>

        {periods.map((p) =>
          p.isBreak ? (
            <div
              key={p.periodId}
              className="flex items-center justify-center gap-2 py-2.5 text-[12.5px] font-medium text-muted"
              style={{ backgroundColor: "var(--surface-sunken)", borderBottom: "1px solid var(--line)" }}
            >
              <Icon name="time" sx={{ fontSize: 15, color: "var(--faint)" }} />
              {p.label} · {p.start}–{p.end}
            </div>
          ) : (
            <div
              key={p.periodId}
              className="grid"
              style={{ gridTemplateColumns: gridCols, borderBottom: "1px solid var(--line)" }}
            >
              <div className="px-3 py-3">
                <p className="text-[13px] font-semibold text-ink-strong">{p.label}</p>
                <p className="tabular text-[11.5px] text-faint">
                  {p.start}–{p.end}
                </p>
              </div>
              {days.map((d) => {
                const cell = p.cells[d.key];
                return (
                  <div key={d.key} className="px-2 py-2" style={{ borderLeft: "1px solid var(--line)" }}>
                    {cell ? (
                      <div
                        className="h-full rounded-[10px] px-2.5 py-2"
                        style={{ backgroundColor: "var(--brand-softer)", border: "1px solid var(--brand-soft)" }}
                      >
                        <p className="text-[12.5px] font-semibold text-ink-strong leading-snug">{cell.subject}</p>
                        <p className="mt-1 flex items-center gap-1 text-[11.5px] text-muted">
                          <Icon name="place" sx={{ fontSize: 13 }} />
                          {cell.room}
                        </p>
                        <p className="truncate text-[11.5px] text-faint">{cell.teacher}</p>
                      </div>
                    ) : (
                      <div className="grid h-full min-h-[52px] place-items-center text-[13px] text-faint">–</div>
                    )}
                  </div>
                );
              })}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
