import Link from "next/link";
import { Button } from "@/components/ui/button";
import SectionCard from "./section-card";
import type { ScheduleItem } from "../types";

interface TodayScheduleProps {
  date: string;
  items: ScheduleItem[];
  weekdayLabel: string;
  isSchoolDay: boolean;
}

export default function TodaySchedule({ date, items, weekdayLabel, isSchoolDay }: TodayScheduleProps): React.ReactNode {
  return (
    <SectionCard
      title="ตารางสอนวันนี้"
      caption={weekdayLabel}
      action={<Button asChild variant="outline" size="sm"><Link href="/dashboard/timetable">ดูตารางทั้งสัปดาห์</Link></Button>}
      bodyClassName="p-0"
    >
      {items.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted sm:px-5">
          {isSchoolDay ? "ไม่มีคาบสอนของคุณในวันนี้" : "วันนี้ไม่มีคาบสอน"}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-sm sm:px-5">
              <span className="shrink-0 tabular text-muted">{item.start}–{item.end}</span>
              <div className="min-w-[10rem] flex-1">
                <p className="font-semibold text-ink-strong">{item.subject}</p>
                <p className="text-xs text-muted">ห้องเรียน {item.classroom} · {item.room}</p>
              </div>
              {item.now && <span className="text-xs font-semibold text-brand-ink">คาบปัจจุบัน</span>}
              <Button asChild variant="outline" size="sm">
                <Link href={"/dashboard/attendance?" + new URLSearchParams({ mode: "class", offering: item.offeringId, date })}>
                  เช็คชื่อคาบนี้
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
