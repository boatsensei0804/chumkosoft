import { Info, TriangleAlert, CheckCircle2, type LucideIcon } from "lucide-react";
import SectionCard from "./section-card";
import type { Announcement, AnnouncementKind } from "../types";

const kindStyle: Record<AnnouncementKind, { icon: LucideIcon; bg: string; fg: string }> = {
  info: { icon: Info, bg: "var(--info-soft)", fg: "var(--blue-ink)" },
  warning: { icon: TriangleAlert, bg: "var(--warning-soft)", fg: "oklch(0.5 0.13 55)" },
  success: { icon: CheckCircle2, bg: "var(--success-soft)", fg: "oklch(0.42 0.1 152)" },
};

export default function Announcements({ items }: { items: Announcement[] }): React.ReactNode {
  return (
    <SectionCard title="ประกาศและการแจ้งเตือน" caption="อัปเดตล่าสุดจากฝ่ายต่าง ๆ" bodyClassName="p-2">
      {items.length === 0 ? (
        <p className="px-3 py-8 text-center text-[13.5px] text-muted">ยังไม่มีประกาศ</p>
      ) : (
        <ul className="flex flex-col">
          {items.map((a) => {
          const s = kindStyle[a.kind];
          const KindIcon = s.icon;
          return (
            <li key={a.id} className="flex gap-3 rounded-[12px] p-3 transition-colors hover:bg-surface-2">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-[10px]"
                style={{ backgroundColor: s.bg, color: s.fg }}
                aria-hidden="true"
              >
                <KindIcon className="size-[19px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-ink-strong">{a.title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted" style={{ textWrap: "pretty" }}>
                  {a.body}
                </p>
                <p className="mt-1.5 text-[12px] text-faint">
                  {a.postedBy} · {a.postedAt}
                </p>
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
