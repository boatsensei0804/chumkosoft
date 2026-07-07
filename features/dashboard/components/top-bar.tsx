"use client";

import IconButton from "@mui/material/IconButton";
import Icon from "./icon";

interface TopBarProps {
  onOpenNav: () => void;
  today: string;
  onOpenPalette: () => void;
}

export default function TopBar({ onOpenNav, today, onOpenPalette }: TopBarProps): React.ReactNode {
  return (
    <header
      className="sticky top-0 flex h-16 items-center gap-3 px-4 lg:px-8"
      style={{
        zIndex: "var(--z-sticky)",
        backgroundColor: "color-mix(in oklch, var(--bg) 82%, transparent)",
        backdropFilter: "saturate(1.4) blur(8px)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <IconButton onClick={onOpenNav} aria-label="เปิดเมนู" className="lg:!hidden" size="small">
        <Icon name="menu" />
      </IconButton>

      {/* Opens the ⌘K command palette — a real destination search, not a text field. */}
      <button
        type="button"
        onClick={onOpenPalette}
        aria-label="ค้นหาและไปยังหน้า (⌘K)"
        aria-keyshortcuts="Meta+K Control+K"
        className="flex w-full max-w-md items-center gap-2.5 rounded-[10px] px-3 py-2 text-left transition-colors hover:border-line-strong"
        style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--line)" }}
      >
        <Icon name="search" sx={{ fontSize: 19, color: "var(--faint)" }} />
        <span className="flex-1 text-[14px] text-faint">ค้นหาเมนู ไปยังหน้า…</span>
        <kbd className="hidden shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted sm:block" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)" }}>
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <div
          className="hidden items-center gap-2 rounded-[10px] px-3 py-1.5 text-[13px] font-medium text-muted md:flex"
          style={{ backgroundColor: "var(--surface-2)" }}
        >
          <Icon name="calendar" sx={{ fontSize: 17, color: "var(--faint)" }} />
          <span className="tabular">{today}</span>
        </div>
      </div>
    </header>
  );
}
