import Icon from "./icon";
import SectionCard from "./section-card";
import type { Announcement, AnnouncementKind } from "../types";

const kindStyle: Record<AnnouncementKind, { icon: string; bg: string; fg: string }> = {
  info: { icon: "info", bg: "var(--info-soft)", fg: "var(--blue-ink)" },
  warning: { icon: "warning", bg: "var(--warning-soft)", fg: "oklch(0.5 0.13 55)" },
  success: { icon: "success", bg: "var(--success-soft)", fg: "oklch(0.42 0.1 152)" },
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
          return (
            <li key={a.id} className="flex gap-3 rounded-[12px] p-3 transition-colors hover:bg-surface-2">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-[10px]"
                style={{ backgroundColor: s.bg, color: s.fg }}
                aria-hidden="true"
              >
                <Icon name={s.icon} sx={{ fontSize: 19 }} />
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
