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
    <div className="relative min-h-dvh bg-[linear-gradient(180deg,var(--surface)_0%,oklch(0.945_0.024_254)_100%)]">
      {/* Ambient guilloché texture — fixed, behind all content */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='22'%3E%3Cpath d='M0 11 Q 32 -1 64 11 T 128 11' fill='none' stroke='%233b5bdb' stroke-width='1' stroke-opacity='0.08'/%3E%3C/svg%3E\")",
          backgroundSize: "128px 22px",
          maskImage: "linear-gradient(180deg, transparent 0%, #000 22%, #000 100%)",
        }}
      />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-[var(--z-sticky)] hidden w-[264px] border-r border-line lg:block">
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
      <div className="relative z-10 lg:pl-[264px]">
        <TopBar user={user} onOpenNav={() => setNavOpen(true)} today={today} onOpenPalette={() => setPaletteOpen(true)} />
        <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} items={commandItems} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
