"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import SidebarContent from "./sidebar-content";
import TopBar from "./top-bar";
import CommandPalette from "./command-palette";
import Icon from "./icon";
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
    <div
      className="relative min-h-dvh"
      style={{
        background:
          "linear-gradient(180deg, var(--surface) 0%, oklch(0.945 0.024 254) 100%)",
      }}
    >
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
      <aside
        className="fixed inset-y-0 left-0 hidden w-[264px] lg:block"
        style={{ zIndex: "var(--z-sticky)", borderRight: "1px solid var(--line)" }}
      >
        <SidebarContent user={user} />
      </aside>

      {/* Mobile drawer */}
      <Drawer
        open={navOpen}
        onClose={() => setNavOpen(false)}
        ModalProps={{ keepMounted: true }}
        slotProps={{
          paper: { sx: { width: 280, border: "none", backgroundColor: "var(--surface-2)" } },
        }}
      >
        <div className="relative h-full">
          <IconButton
            onClick={() => setNavOpen(false)}
            aria-label="ปิดเมนู"
            size="small"
            className="!absolute right-3 top-3.5"
            sx={{ zIndex: 1 }}
          >
            <Icon name="close" sx={{ fontSize: 20 }} />
          </IconButton>
          <SidebarContent user={user} onNavigate={() => setNavOpen(false)} />
        </div>
      </Drawer>

      {/* Content column */}
      <div className="relative z-10 lg:pl-[264px]">
        <TopBar onOpenNav={() => setNavOpen(true)} today={today} onOpenPalette={() => setPaletteOpen(true)} />
        <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} items={commandItems} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
