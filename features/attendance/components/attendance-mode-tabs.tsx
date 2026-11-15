"use client";

import { useRouter } from "next/navigation";
import { CalendarCheck, ClipboardCheck, UserCheck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "class" | "school" | "homeroom";

const TABS: { key: Mode; label: string; description: string; icon: LucideIcon }[] = [
  { key: "class", label: "รายวิชา", description: "เช็คชื่อในคาบเรียนที่สอน", icon: ClipboardCheck },
  { key: "homeroom", label: "ประจำห้อง", description: "ภาพรวมและรายชื่อในห้องที่ปรึกษา", icon: CalendarCheck },
  { key: "school", label: "เข้า–ออกโรงเรียน", description: "ตรวจเวลาที่บันทึกจากแอปสแกน", icon: UserCheck },
];

export default function AttendanceModeTabs({ mode }: { mode: Mode }): React.ReactNode {
  const router = useRouter();

  return (
    <div role="tablist" aria-label="รูปแบบการเช็คชื่อ" className="grid w-full grid-cols-3 gap-1 rounded-2xl border border-blue-100 bg-white p-1">
      {TABS.map((t) => {
        const active = mode === t.key;
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            title={t.description}
            role="tab"
            aria-selected={active}
            onClick={() => router.push(`/dashboard/attendance?mode=${t.key}`)}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 py-2 text-center text-xs font-semibold transition-colors sm:text-sm",
              active ? "bg-brand text-white shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            <Icon className="hidden size-4 shrink-0 sm:block" />
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
