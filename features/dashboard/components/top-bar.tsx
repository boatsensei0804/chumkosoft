"use client";

import { usePathname } from "next/navigation";
import { navGroups } from "../nav";
import { Menu, Search, CalendarDays, LogOut, ChevronDown } from "lucide-react";
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
  onOpenNav: () => void;
  today: string;
  onOpenPalette: () => void;
}

export default function TopBar({ user, onOpenNav, today, onOpenPalette }: TopBarProps): React.ReactNode {
  const pathname = usePathname();
  const current = navGroups.flatMap((group) => group.items).filter((item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`))).sort((a, b) => b.href.length - a.href.length)[0];
  return (
    <header className="sticky top-0 z-[var(--z-sticky)] flex h-16 items-center gap-3 border-b border-blue-100/70 bg-white/90 px-4 backdrop-blur-xl xl:px-7">
      <Button variant="ghost" size="icon" onClick={onOpenNav} aria-label="เปิดเมนู" className="xl:hidden">
        <Menu className="size-5" />
      </Button>

      <div className="hidden shrink-0 border-r border-line pr-5 lg:block"><p className="text-[10px] font-bold tracking-[0.16em] text-brand">CHUMKOSOFT</p><p className="mt-0.5 text-sm font-semibold text-ink-strong">{current?.label ?? "พื้นที่ทำงาน"}</p></div>

      {/* Opens the ⌘K command palette — a real destination search, not a text field. */}
      <button
        type="button"
        onClick={onOpenPalette}
        aria-label="ค้นหาและไปยังหน้า (⌘K)"
        aria-keyshortcuts="Meta+K Control+K"
        className="flex w-full max-w-sm items-center gap-2.5 rounded-full border border-blue-100 bg-blue-50/60 px-3 py-2 text-left transition-colors hover:border-line-strong"
      >
        <Search className="size-[19px] text-faint" />
        <span className="flex-1 text-[14px] text-faint">ค้นหาเมนู ไปยังหน้า…</span>
        <kbd className="hidden shrink-0 rounded-md border border-line bg-bg px-1.5 py-0.5 text-[11px] font-medium text-muted sm:block">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-[10px] bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-muted md:flex">
          <CalendarDays className="size-[17px] text-faint" />
          <span className="tabular">{today}</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-surface-2"
              aria-label="เมนูบัญชีผู้ใช้"
            >
              <Avatar className="size-8">
                <AvatarFallback className="bg-brand-soft text-[13px] font-semibold text-brand-ink">{user.initials}</AvatarFallback>
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
