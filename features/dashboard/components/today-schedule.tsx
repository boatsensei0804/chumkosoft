import Icon from "./icon";
import SectionCard from "./section-card";
import type { ScheduleItem } from "../types";

interface TodayScheduleProps {
  items: ScheduleItem[];
  weekdayLabel: string;
  classroomCode: string | null;
  isSchoolDay: boolean;
}

export default function TodaySchedule({ items, weekdayLabel, classroomCode, isSchoolDay }: TodayScheduleProps): React.ReactNode {
  const caption = classroomCode
    ? `${weekdayLabel} · ${classroomCode} · ${items.length} คาบเรียน`
    : `${weekdayLabel}`;

  return (
    <SectionCard
      title="ตารางสอนวันนี้"
      caption={caption}
      action={
        <button
          type="button"
          className="rounded-lg px-2.5 py-1 text-[13px] font-semibold text-brand-ink transition-colors hover:bg-brand-soft"
        >
          ดูทั้งสัปดาห์
        </button>
      }
      bodyClassName="p-2"
    >
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <span className="grid size-11 place-items-center rounded-full" style={{ backgroundColor: "var(--surface-2)", color: "var(--faint)" }} aria-hidden="true">
            <Icon name="calendar" sx={{ fontSize: 22 }} />
          </span>
          <p className="text-[14px] font-semibold text-ink-strong">
            {isSchoolDay ? "ยังไม่มีคาบเรียนในวันนี้" : "วันนี้เป็นวันหยุด ไม่มีคาบเรียน"}
          </p>
          <p className="text-[12.5px] text-muted">
            {isSchoolDay ? "จัดตารางเพิ่มได้ที่หน้าจัดตารางสอน" : "ตารางเรียนจะแสดงในวันเปิดเรียน"}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex gap-3.5 rounded-[12px] p-3 transition-colors"
              style={item.now ? { backgroundColor: "var(--brand-softer)" } : undefined}
            >
              <div className="flex w-[52px] shrink-0 flex-col items-end pt-0.5">
                <span className="tabular text-[13px] font-bold text-ink-strong">{item.start}</span>
                <span className="tabular text-[12px] text-faint">{item.end}</span>
              </div>
              <div
                className="mt-1 w-0.5 shrink-0 self-stretch rounded-full"
                style={{ backgroundColor: item.now ? "var(--brand)" : "var(--line-strong)" }}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1 pb-0.5">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[14px] font-semibold text-ink-strong">{item.subject}</p>
                  {item.now && (
                    <span
                      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{ backgroundColor: "var(--brand)", color: "var(--on-primary)" }}
                    >
                      <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
                      กำลังเรียน
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[13px] text-muted">
                  {item.classroom} · {item.teacher}
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-[12.5px] text-faint">
                  <Icon name="place" sx={{ fontSize: 14 }} />
                  {item.room}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
