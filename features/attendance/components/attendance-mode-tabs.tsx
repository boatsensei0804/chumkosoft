import Link from "next/link";
import { CalendarCheck, ClipboardCheck, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "class", label: "รายคาบ", icon: ClipboardCheck },
  { key: "homeroom", label: "ประจำห้อง", icon: CalendarCheck },
  { key: "school", label: "เข้า–ออกโรงเรียน", icon: UserCheck },
] as const;

export default function AttendanceModeTabs({ mode, date, month }: { mode: (typeof tabs)[number]["key"]; date: string; month: string }) {
  return (
    <nav aria-label="รูปแบบการเช็คชื่อ" className="grid w-full grid-cols-3 gap-1 rounded-xl border border-line bg-card p-1">
      {tabs.map(({ key, label, icon: Icon }) => (
        <Link
          key={key}
          href={"/dashboard/attendance?" + new URLSearchParams({ mode: key, date, month })}
          aria-current={mode === key ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 py-2 text-center text-xs font-semibold transition-colors sm:text-sm",
            mode === key ? "bg-brand text-white" : "text-muted hover:bg-school-panel-tint hover:text-ink",
          )}
        >
          <Icon aria-hidden="true" className="hidden size-4 shrink-0 sm:block" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
