"use client";

import { CalendarDays, ChevronDown, Database, LogOut, MessagesSquare, Settings2, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import Mascot from "@/components/ui/mascot";
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

const groupIcons: Record<string, LucideIcon> = {
  "ทะเบียนข้อมูล": Database,
  "ตารางและเช็คชื่อ": CalendarDays,
  "สแกนและสื่อสาร": MessagesSquare,
  "ระบบ": Settings2,
};

export default function SidebarContent({ user, onNavigate }: SidebarContentProps): React.ReactNode {
  const pathname = usePathname();
  const groups = navGroups
    .map((g) => ({ label: g.label, items: g.items.filter(visibleTo(user.role)) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-white via-[#fafdff] to-[#eaf6ff]">
      <svg aria-hidden="true" viewBox="0 0 288 150" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-[150px] w-full">
        <path d="M0 68 C52 33 95 59 145 75 C201 93 237 39 288 57 L288 150 L0 150Z" fill="#e0f3ff" />
        <path d="M0 100 C56 68 105 101 152 102 C209 104 248 75 288 78 L288 150 L0 150Z" fill="#b8e2fc" />
        <path d="M0 129 C57 98 107 132 164 124 C214 117 254 101 288 109 L288 150 L0 150Z" fill="#88c9f3" />
        <circle cx="18" cy="96" r="18" fill="#a5d962" /><circle cx="41" cy="92" r="17" fill="#b3e06f" /><circle cx="263" cy="84" r="22" fill="#a3d962" /><circle cx="283" cy="91" r="17" fill="#b5df70" />
      </svg>
      <div className="relative z-10 border-b border-[#d9eaff] px-4 py-3">
        <div className="flex items-center gap-3 rounded-[18px] bg-white/90 px-2 py-1.5">
          <Mascot pose="welcome" size={58} decorative priority />
          <div className="min-w-0"><p className="text-[18px] font-extrabold leading-[1.05] tracking-tight text-[#0b315f]">Chumkosoft<br />School</p><p className="mt-1 text-[11px] font-medium text-[#55799b]">โรงเรียนที่เชื่อมถึงกัน</p></div>
        </div>
      </div>

      <nav aria-label="เมนูหลัก" className="relative z-10 flex flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain px-3 py-3 [scrollbar-width:thin]">
        {groups.map((group, i) => {
          const active = group.items.some((item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)));
          if (!group.label) return <div key={`group-${i}`} className="shrink-0"><SidebarNav items={group.items} onNavigate={onNavigate} /></div>;
          const GroupIcon = groupIcons[group.label] ?? Database;
          return <details key={`${group.label}-${active ? "active" : "inactive"}`} open={active || group.label === "ทะเบียนข้อมูล"} className="group/nav shrink-0 rounded-[16px]">
            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-xl px-2.5 text-[13px] font-bold text-[#597898] hover:bg-[#eaf5ff] [&::-webkit-details-marker]:hidden">
              <GroupIcon className="size-4 text-[#1779c8]" aria-hidden="true" /><span className="flex-1">{group.label}</span><ChevronDown className="size-4 transition-transform group-open/nav:rotate-180" />
            </summary>
            <div className="border-l border-[#d6eaff] py-1 pl-2 ml-4"><SidebarNav items={group.items} onNavigate={onNavigate} /></div>
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
