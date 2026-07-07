"use client";

import { useRouter } from "next/navigation";
import Icon from "@/features/dashboard/components/icon";

type View = "students" | "rooms";

const TABS: { key: View; label: string; icon: string }[] = [
  { key: "students", label: "รายชื่อนักเรียน", icon: "school" },
  { key: "rooms", label: "ภาพรวมรายห้อง", icon: "groups" },
];

export default function FacesViewTabs({ view }: { view: View }): React.ReactNode {
  const router = useRouter();

  return (
    <div role="tablist" aria-label="มุมมองชุดข้อมูลใบหน้า" className="inline-flex gap-1 rounded-[12px] p-1" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--line)" }}>
      {TABS.map((t) => {
        const active = view === t.key;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => router.push(`/dashboard/faces?view=${t.key}`)}
            className="inline-flex items-center gap-2 rounded-[9px] px-3.5 py-2 text-[13.5px] font-semibold transition-colors"
            style={{
              backgroundColor: active ? "var(--bg)" : "transparent",
              color: active ? "var(--brand-ink)" : "var(--muted)",
              boxShadow: active ? "var(--shadow-sm)" : "none",
            }}
          >
            <Icon name={t.icon} sx={{ fontSize: 18 }} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
