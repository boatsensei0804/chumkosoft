"use client";

import { useRouter } from "next/navigation";
import Icon from "@/features/dashboard/components/icon";

type Mode = "class" | "school";

const TABS: { key: Mode; label: string; icon: string }[] = [
  { key: "class", label: "เช็คชื่อเข้าเรียน", icon: "checklist" },
  { key: "school", label: "เช็คชื่อเข้าโรงเรียน", icon: "how_to_reg" },
];

export default function AttendanceModeTabs({ mode }: { mode: Mode }): React.ReactNode {
  const router = useRouter();

  return (
    <div role="tablist" aria-label="รูปแบบการเช็คชื่อ" className="inline-flex gap-1 rounded-[12px] p-1" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--line)" }}>
      {TABS.map((t) => {
        const active = mode === t.key;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => router.push(`/dashboard/attendance?mode=${t.key}`)}
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
