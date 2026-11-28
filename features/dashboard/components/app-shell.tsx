"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import SidebarContent from "./sidebar-content";
import TopBar from "./top-bar";
import CommandPalette from "./command-palette";
import { getNavGroups } from "../nav";
import type { CurrentUser } from "@/lib/dal";

interface AppShellProps {
  children: ReactNode;
  user: CurrentUser;
  today: string;
}

export default function AppShell({ children, user, today }: AppShellProps): ReactNode {
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Every destination the current role can reach, flattened for the ⌘K palette.
  const commandItems = useMemo(
    () => getNavGroups(user.role).flatMap((group) => group.items).filter((item) => item.available),
    [user.role],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="school-workspace relative min-h-dvh bg-surface xl:h-dvh xl:overflow-hidden">
      <a href="#dashboard-main" className="sr-only z-[var(--z-tooltip)] rounded-lg bg-card px-4 py-3 font-semibold text-brand-ink shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4">ข้ามไปยังเนื้อหาหลัก</a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-[var(--z-sticky)] hidden w-60 bg-nav-surface xl:block">
        <SidebarContent user={user} />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" showCloseButton={false} aria-describedby={undefined} className="w-72 max-w-[90vw] border-none bg-nav-surface p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>เมนูหลัก</SheetTitle>
          </SheetHeader>
          <SidebarContent user={user} onNavigate={() => setNavOpen(false)} />
          <SheetClose aria-label="ปิดเมนู" className="absolute right-3 top-2.5 grid size-11 place-items-center rounded-lg text-nav-ink hover:bg-nav-hover focus-visible:outline-2 focus-visible:outline-sky-accent">
            <X className="size-5" aria-hidden="true" />
          </SheetClose>
        </SheetContent>
      </Sheet>

      {/* Content column */}
      <div className="relative z-10 xl:flex xl:h-dvh xl:min-h-0 xl:flex-col xl:pl-60">
        <TopBar user={user} onOpenNav={() => setNavOpen(true)} today={today} onOpenPalette={() => setPaletteOpen(true)} />
        <main id="dashboard-main" tabIndex={-1} className="mx-auto w-full max-w-[1480px] scroll-mt-20 px-4 pb-10 pt-5 sm:px-6 sm:pt-7 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain xl:px-8">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} items={commandItems} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
