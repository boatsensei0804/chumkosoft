"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import SidebarContent from "./sidebar-content";
import TopBar from "./top-bar";
import CommandPalette from "./command-palette";
import { navGroups } from "../nav";
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
    () => navGroups.flatMap((g) => g.items).filter((i) => i.available && (!i.roles || i.roles.includes(user.role))),
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
    <div className="school-workspace relative min-h-dvh bg-[#f4f8fd] xl:h-dvh xl:overflow-hidden">
      <a href="#dashboard-main" className="sr-only z-50 rounded-xl bg-white px-4 py-3 font-semibold text-brand-ink shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4">ข้ามไปยังเนื้อหาหลัก</a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-[var(--z-sticky)] hidden w-[264px] overflow-hidden border-r border-blue-100 bg-white shadow-[5px_0_20px_#1648780b] xl:block">
        <SidebarContent user={user} />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-[280px] border-none bg-surface-2 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>เมนูหลัก</SheetTitle>
          </SheetHeader>
          <SidebarContent user={user} onNavigate={() => setNavOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Content column */}
      <div className="relative z-10 xl:flex xl:h-dvh xl:min-h-0 xl:flex-col xl:pl-[264px]">
        <TopBar user={user} onOpenNav={() => setNavOpen(true)} today={today} onOpenPalette={() => setPaletteOpen(true)} />
        <main id="dashboard-main" tabIndex={-1} className="mx-auto w-full max-w-[1480px] px-4 py-4 sm:px-6 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain xl:px-7">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} items={commandItems} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
