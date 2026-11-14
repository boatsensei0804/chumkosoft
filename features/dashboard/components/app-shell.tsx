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
    <div className="school-workspace relative min-h-dvh bg-[#eef5fc]">

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-4 left-4 z-[var(--z-sticky)] hidden w-[248px] overflow-hidden rounded-[24px] border border-white bg-bg shadow-[0_12px_48px_#16487812] xl:block">
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
      <div className="relative z-10 xl:pl-[280px]">
        <TopBar user={user} onOpenNav={() => setNavOpen(true)} today={today} onOpenPalette={() => setPaletteOpen(true)} />
        <main className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 sm:py-7 xl:px-7">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} items={commandItems} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
