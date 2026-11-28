"use client";

import { BookOpen, ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SidebarNav from "./sidebar-nav";
import BrandMark from "./brand-mark";
import Mascot from "@/components/ui/mascot";
import { getCurrentNavItem, getNavGroups } from "../nav";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/lib/dal";

interface SidebarContentProps {
  user: CurrentUser;
  onNavigate?: () => void;
  compact?: boolean;
}

export default function SidebarContent({ user, onNavigate, compact = false }: SidebarContentProps): React.ReactNode {
  const pathname = usePathname();
  const groups = getNavGroups(user.role);
  const current = getCurrentNavItem(groups, pathname);

  return (
    <div className="flex h-full flex-col bg-nav-surface text-nav-ink [&_a:focus-visible]:outline-sky-accent [&_summary:focus-visible]:outline-sky-accent">
      <Link href="/dashboard" onClick={onNavigate} aria-label="Chumkosoft ภาพรวม" className={cn("flex h-17 shrink-0 items-center border-b border-nav-line focus-visible:-outline-offset-4", compact ? "mx-2 justify-center" : "mx-4")}>
        {compact ? <Mascot pose="welcome" size={38} decorative /> : <BrandMark inverse />}
      </Link>

      <nav aria-label="เมนูหลัก" className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain py-4 [scrollbar-width:thin]", compact ? "px-2" : "px-3")}>
        {groups.map((group, i) => {
          if (compact) return (
            <div key={group.label ?? "overview"} className={cn("shrink-0", i > 0 && "border-t border-nav-line pt-2")}>
              <SidebarNav items={group.items} activeKey={current?.key} compact />
            </div>
          );
          const active = group.items.some((item) => item.key === current?.key);
          if (!group.label) return <div key={`group-${i}`} className="shrink-0"><SidebarNav items={group.items} activeKey={current?.key} onNavigate={onNavigate} /></div>;
          if (group.openByDefault) return (
            <div key={group.label} className="mt-3 shrink-0">
              <p className="mb-1 px-3 text-xs font-semibold text-nav-muted">{group.label}</p>
              <SidebarNav items={group.items} activeKey={current?.key} onNavigate={onNavigate} />
            </div>
          );
          const GroupIcon = group.icon;
          return <details key={`${group.label}-${active ? "active" : "inactive"}`} open={active || undefined} className="group/nav shrink-0 rounded-xl">
            <summary className={cn(
              "flex min-h-11 cursor-pointer list-none items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-semibold transition-colors hover:bg-nav-hover [&::-webkit-details-marker]:hidden",
              active ? "text-sky-accent" : "text-nav-muted",
            )}>
              {GroupIcon && <GroupIcon className="size-4 shrink-0" aria-hidden="true" />}<span className="flex-1">{group.label}</span><ChevronDown aria-hidden="true" className="size-4 shrink-0 motion-safe:transition-transform group-open/nav:rotate-180" />
            </summary>
            <div className="ml-4 border-l border-nav-line py-1 pl-2"><SidebarNav items={group.items} activeKey={current?.key} onNavigate={onNavigate} /></div>
          </details>;
        })}
      </nav>
      <div className="mx-2 shrink-0 border-t border-nav-line py-2">
        <Link href="/guide?role=teacher" onClick={onNavigate} title={compact ? "คู่มือการใช้งาน" : undefined} className={cn("flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 text-sm text-nav-muted hover:bg-nav-hover hover:text-nav-ink", compact && "justify-center")}>
          <BookOpen className="size-[18px] shrink-0" aria-hidden="true" />
          <span className={compact ? "sr-only" : undefined}>คู่มือการใช้งาน</span>
        </Link>
      </div>
    </div>
  );
}
