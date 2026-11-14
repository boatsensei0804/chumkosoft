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
    <div role="tablist" aria-label="รูปแบบการเช็คชื่อ" className="grid w-full gap-2 rounded-[22px] border border-blue-100 bg-white p-2 sm:grid-cols-3">
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
              "flex min-h-16 items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors",
              active ? "bg-brand text-white shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            <Icon className="size-[18px]" />
            <span><span className="block">{t.label}</span><span className={`mt-1 block text-xs font-normal ${active ? "text-blue-100" : "text-muted"}`}>{t.description}</span></span>
          </button>
        );
      })}
    </div>
  );
}
