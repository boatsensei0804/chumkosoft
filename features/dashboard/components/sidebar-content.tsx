"use client";

import { ChevronDown, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import Mascot from "@/components/ui/mascot";
import SidebarNav from "./sidebar-nav";
import { getCurrentNavItem, getNavGroups } from "../nav";
import { logoutAction } from "@/features/auth/actions";
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
    <div className="relative flex h-full flex-col overflow-hidden bg-school-panel-tint">
      <div className="relative z-10 border-b border-[#d9eaff] px-4 py-3">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <Mascot pose="welcome" size={58} decorative priority />
          <div className="min-w-0"><p className="text-[18px] font-extrabold leading-[1.05] tracking-tight text-[#0b315f]">Chumkosoft</p></div>
        </div>
      </div>

      <nav aria-label="เมนูหลัก" className="relative z-10 flex flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain px-3 py-3 [scrollbar-width:thin]">
        {groups.map((group, i) => {
          const active = group.items.some((item) => item.key === current?.key);
          if (!group.label) return <div key={`group-${i}`} className="shrink-0"><SidebarNav items={group.items} activeKey={current?.key} onNavigate={onNavigate} /></div>;
          const GroupIcon = group.icon;
          return <details key={`${group.label}-${active ? "active" : "inactive"}`} open={active || group.openByDefault || undefined} className="group/nav shrink-0 rounded-[16px]">
            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-xl px-2.5 text-[13px] font-bold text-[#597898] hover:bg-[#eaf5ff] [&::-webkit-details-marker]:hidden">
              {GroupIcon && <GroupIcon className="size-4 text-brand" aria-hidden="true" />}<span className="flex-1">{group.label}</span><ChevronDown aria-hidden="true" className="size-4 transition-transform group-open/nav:rotate-180" />
            </summary>
            <div className="border-l border-[#d6eaff] py-1 pl-2 ml-4"><SidebarNav items={group.items} activeKey={current?.key} onNavigate={onNavigate} /></div>
          </details>;
        })}
      </nav>

      <div className="relative z-10 px-3 pb-3 pt-2">
        <div className="flex items-center gap-2.5 rounded-[18px] border border-[#c7e4fa] bg-white/95 p-2.5 shadow-[0_8px_20px_#1d69b526]">
          <span
            className="grid size-[42px] shrink-0 place-items-center rounded-full bg-[#dff0ff] text-[14px] font-bold text-[#075bb0]"
            aria-hidden="true"
          >
            {user.initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[13px] font-bold leading-4 text-[#0b315f]">{user.displayName}</p>
            <p className="line-clamp-2 text-[11px] leading-4 text-[#55799b]">{user.subtitle}</p>
          </div>
          <form action={logoutAction} className="shrink-0">
            <button
              type="submit"
              title="ออกจากระบบ"
              aria-label="ออกจากระบบ"
              className="grid size-8 place-items-center rounded-lg text-[#55799b] transition-colors hover:bg-[#eaf5ff] hover:text-[#075bb0]"
            >
              <LogOut className="size-[18px]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
