"use client";

import { useRouter } from "next/navigation";
import { CalendarCheck, ClipboardCheck, UserCheck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "class" | "school" | "homeroom";

const TABS: { key: Mode; label: string; icon: LucideIcon }[] = [
  { key: "class", label: "เช็คชื่อเข้าเรียน", icon: ClipboardCheck },
  { key: "homeroom", label: "เช็คชื่อประจำห้อง", icon: CalendarCheck },
  { key: "school", label: "เช็คชื่อเข้าโรงเรียน", icon: UserCheck },
];

export default function AttendanceModeTabs({ mode }: { mode: Mode }): React.ReactNode {
  const router = useRouter();

  return (
    <div role="tablist" aria-label="รูปแบบการเช็คชื่อ" className="inline-flex gap-1 rounded-[12px] border border-line bg-surface-2 p-1">
      {TABS.map((t) => {
        const active = mode === t.key;
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => router.push(`/dashboard/attendance?mode=${t.key}`)}
            className={cn(
              "inline-flex items-center gap-2 rounded-[9px] px-3.5 py-2 text-[13.5px] font-semibold transition-colors",
              active ? "bg-card text-brand-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            <Icon className="size-[18px]" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
