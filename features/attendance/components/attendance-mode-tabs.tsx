import Link from "next/link";
import { CalendarCheck, ClipboardCheck, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "class", label: "รายคาบ", icon: ClipboardCheck },
  { key: "homeroom", label: "ประจำห้อง", icon: CalendarCheck },
  { key: "school", label: "เข้า–ออกโรงเรียน", icon: UserCheck },
] as const;

export default function AttendanceModeTabs({ mode, date, month, classroomId }: { mode: (typeof tabs)[number]["key"]; date: string; month: string; classroomId?: string }) {
  return (
    <nav aria-label="รูปแบบการเช็คชื่อ" className="grid w-full grid-cols-3 gap-1 rounded-lg bg-surface p-1 sm:max-w-xl xl:w-auto">
      {tabs.map(({ key, label, icon: Icon }) => (
        <Link
          key={key}
          href={"/dashboard/attendance?" + new URLSearchParams({ mode: key, date, month, ...(key !== "class" && classroomId ? { classroom: classroomId } : {}) })}
          aria-current={mode === key ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center justify-center gap-2 rounded-md px-2 py-2 text-center text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:px-4 sm:text-sm",
            mode === key ? "bg-brand text-white" : "text-ink hover:bg-brand-soft hover:text-brand-ink",
          )}
        >
          <Icon aria-hidden="true" className="hidden size-4 shrink-0 sm:block" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
