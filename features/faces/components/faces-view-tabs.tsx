"use client";

import { useRouter } from "next/navigation";
import { GraduationCap, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type View = "students" | "rooms";

const TABS: { key: View; label: string; icon: LucideIcon }[] = [
  { key: "students", label: "รายชื่อนักเรียน", icon: GraduationCap },
  { key: "rooms", label: "ภาพรวมรายห้อง", icon: Users },
];

export default function FacesViewTabs({ view }: { view: View }): React.ReactNode {
  const router = useRouter();

  return (
    <div role="tablist" aria-label="มุมมองชุดข้อมูลใบหน้า" className="inline-flex gap-1 rounded-[12px] border border-line bg-surface-2 p-1">
      {TABS.map((t) => {
        const active = view === t.key;
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => router.push(`/dashboard/faces?view=${t.key}`)}
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
