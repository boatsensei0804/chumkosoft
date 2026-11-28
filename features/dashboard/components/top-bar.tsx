"use client";

import type { Ref } from "react";
import { usePathname } from "next/navigation";
import { getCurrentNavItem, getNavGroups } from "../nav";
import { Menu, Search, CalendarDays, LogOut, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/features/auth/actions";
import type { CurrentUser } from "@/lib/dal";

interface TopBarProps {
  user: CurrentUser;
  navOpen: boolean;
  navTrigger: Ref<HTMLButtonElement>;
  onOpenNav: () => void;
  navCollapsed: boolean;
  onToggleNav: () => void;
  today: string;
  onOpenPalette: () => void;
}

export default function TopBar({ user, navOpen, navTrigger, onOpenNav, navCollapsed, onToggleNav, today, onOpenPalette }: TopBarProps): React.ReactNode {
  const pathname = usePathname();
  const groups = getNavGroups(user.role);
  const current = getCurrentNavItem(groups, pathname);
  const section = groups.find((group) => group.items.some((item) => item.key === current?.key))?.label;
  return (
    <header className="sticky top-0 z-30 flex h-17 shrink-0 items-center gap-3 border-b border-line bg-card px-4 sm:px-6 xl:px-8">
      <Button ref={navTrigger} variant="ghost" size="icon" onClick={onOpenNav} aria-label="เปิดเมนู" aria-haspopup="dialog" aria-expanded={navOpen} className="size-11 shrink-0 rounded-lg border border-line bg-surface xl:hidden">
        <Menu aria-hidden="true" className="size-5" />
      </Button>
      <Button
        variant="ghost" size="icon" onClick={onToggleNav}
        aria-label={navCollapsed ? "ขยายเมนูด้านข้าง" : "ย่อเมนูด้านข้าง"}
        aria-controls="desktop-dashboard-nav" aria-expanded={!navCollapsed}
        className="hidden size-11 shrink-0 text-muted xl:inline-flex"
      >
        {navCollapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        {section && (
          <>
            <span className="hidden shrink-0 text-sm text-muted sm:block">{section}</span>
            <ChevronRight className="hidden size-3.5 shrink-0 text-faint sm:block" aria-hidden="true" />
          </>
        )}
        <p className="truncate text-sm font-bold text-ink-strong">{current?.label ?? "พื้นที่ทำงาน"}</p>
      </div>

      {/* Opens the ⌘K command palette — a real destination search, not a text field. */}
      <button
        type="button"
        onClick={onOpenPalette}
        aria-label="ค้นหาและไปยังหน้า (⌘K)"
        aria-keyshortcuts="Meta+K Control+K"
        className="flex size-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-line bg-surface text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-safe:transition-colors hover:border-line-strong hover:bg-brand-soft sm:w-40 sm:justify-start sm:px-3 xl:w-56"
      >
        <Search className="size-[18px] shrink-0 text-brand-ink" aria-hidden="true" />
        <span className="hidden min-w-0 flex-1 truncate text-sm text-muted sm:block">ค้นหาเมนู</span>
        <kbd className="hidden shrink-0 rounded-md border border-line bg-bg px-1.5 py-0.5 text-[11px] font-medium text-muted sm:block">⌘K</kbd>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden items-center gap-2 px-2 text-[13px] font-medium text-muted md:flex">
          <CalendarDays className="size-[17px] text-faint" />
          <span className="tabular">{today}</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex min-h-11 max-w-52 items-center gap-2 rounded-lg border border-transparent px-1.5 focus-visible:outline-2 focus-visible:outline-brand motion-safe:transition-colors hover:border-line hover:bg-surface-2"
              aria-label="เมนูบัญชีผู้ใช้"
            >
              <span className="hidden min-w-0 truncate text-sm font-semibold text-ink 2xl:block">{user.displayName}</span>
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="bg-sky-accent-soft text-[13px] font-semibold text-sky-accent-ink">{user.initials}</AvatarFallback>
              </Avatar>
              <ChevronDown className="hidden size-4 text-muted sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="truncate text-[13.5px] font-semibold text-ink-strong">{user.displayName}</span>
              <span className="truncate text-[12px] font-normal text-muted">{user.subtitle}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <form action={logoutAction}>
              <DropdownMenuItem asChild variant="destructive">
                <button type="submit" className="w-full">
                  <LogOut className="size-4" /> ออกจากระบบ
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
