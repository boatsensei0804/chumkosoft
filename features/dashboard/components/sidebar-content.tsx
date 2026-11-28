"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SidebarNav from "./sidebar-nav";
import BrandMark from "./brand-mark";
import { getCurrentNavItem, getNavGroups } from "../nav";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/lib/dal";

interface SidebarContentProps {
  user: CurrentUser;
  onNavigate?: () => void;
}

export default function SidebarContent({ user, onNavigate }: SidebarContentProps): React.ReactNode {
  const pathname = usePathname();
  const groups = getNavGroups(user.role);
  const current = getCurrentNavItem(groups, pathname);

  return (
    <div className="flex h-full flex-col bg-school-panel">
      <Link href="/dashboard" onClick={onNavigate} aria-label="Chumkosoft ภาพรวม" className="flex h-16 shrink-0 items-center border-b-2 border-amber-300 bg-ink-strong px-4 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white">
        <BrandMark inverse />
      </Link>

      <nav aria-label="เมนูหลัก" className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-width:thin]">
        {groups.map((group, i) => {
          const active = group.items.some((item) => item.key === current?.key);
          if (!group.label) return <div key={`group-${i}`} className="shrink-0"><SidebarNav items={group.items} activeKey={current?.key} onNavigate={onNavigate} /></div>;
          const GroupIcon = group.icon;
          return <details key={`${group.label}-${active ? "active" : "inactive"}`} open={active || group.openByDefault || undefined} className="group/nav shrink-0 rounded-[16px]">
            <summary className={cn(
              "flex min-h-11 cursor-pointer list-none items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-semibold transition-colors hover:bg-surface [&::-webkit-details-marker]:hidden",
              active ? "text-brand-ink" : "text-muted",
            )}>
              {GroupIcon && <GroupIcon className="size-4 shrink-0" aria-hidden="true" />}<span className="flex-1">{group.label}</span><ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform group-open/nav:rotate-180" />
            </summary>
            <div className="ml-4 border-l border-line py-1 pl-2"><SidebarNav items={group.items} activeKey={current?.key} onNavigate={onNavigate} /></div>
          </details>;
        })}
      </nav>
    </div>
  );
}
