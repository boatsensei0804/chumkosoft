"use client";

import { ChevronDown, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import BrandMark from "./brand-mark";
import SidebarNav from "./sidebar-nav";
import { navGroups } from "../nav";
import { logoutAction } from "@/features/auth/actions";
import type { CurrentUser } from "@/lib/dal";
import type { NavItem } from "../types";

interface SidebarContentProps {
  user: CurrentUser;
  onNavigate?: () => void;
}

function visibleTo(role: CurrentUser["role"]): (item: NavItem) => boolean {
  return (item) => !item.roles || item.roles.includes(role);
}

export default function SidebarContent({ user, onNavigate }: SidebarContentProps): React.ReactNode {
  const pathname = usePathname();
  const groups = navGroups
    .map((g) => ({ label: g.label, items: g.items.filter(visibleTo(user.role)) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="flex h-16 items-center px-5" style={{ borderBottom: "1px solid var(--line)" }}>
        <BrandMark />
      </div>

      <nav aria-label="เมนูหลัก" className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
        {groups.map((group, i) => {
          const active = group.items.some((item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)));
          if (!group.label) return <SidebarNav key={`group-${i}`} items={group.items} onNavigate={onNavigate} />;
          return <details key={`${group.label}-${active ? "active" : "inactive"}`} open={active} className="group/nav rounded-xl open:bg-surface-2/60">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between rounded-lg px-3 text-[12px] font-bold text-muted hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
              {group.label}<ChevronDown className="size-4 transition-transform group-open/nav:rotate-180" />
            </summary>
            <div className="px-1 pb-1"><SidebarNav items={group.items} onNavigate={onNavigate} /></div>
          </details>;
        })}
      </nav>

      <div className="px-3 pb-4">
        <div className="flex items-center gap-3 rounded-[12px] p-2.5" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)" }}>
          <span
            className="grid size-[38px] shrink-0 place-items-center rounded-full text-[14px] font-semibold"
            style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand-ink)" }}
            aria-hidden="true"
          >
            {user.initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ink-strong">{user.displayName}</p>
            <p className="truncate text-[12px] text-muted">{user.subtitle}</p>
          </div>
          <form action={logoutAction} className="shrink-0">
            <button
              type="submit"
              title="ออกจากระบบ"
              aria-label="ออกจากระบบ"
              className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <LogOut className="size-[18px]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
