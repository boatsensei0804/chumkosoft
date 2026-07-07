"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Dialog from "@mui/material/Dialog";
import Icon from "./icon";
import type { NavItem } from "../types";

interface CommandPaletteProps {
  open: boolean;
  items: NavItem[];
  onClose: () => void;
}

/**
 * ⌘K command palette: fuzzy-filter navigable destinations and jump with the
 * keyboard. Delivers on the ⌘K affordance shown in the top bar and gives staff a
 * fast path between the many management surfaces.
 */
export default function CommandPalette({ open, items, onClose }: CommandPaletteProps): React.ReactNode {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.label.toLowerCase().includes(q) || i.href.toLowerCase().includes(q));
  }, [items, query]);

  // Clamp at render time so a shrinking result list never leaves `active` out of
  // range — avoids a query→active reset effect (and its set-state-in-effect lint).
  const activeIndex = results.length > 0 ? Math.min(active, results.length - 1) : 0;

  // Reset the query each time the palette opens. Deferred to the next frame so we
  // never call setState synchronously inside the effect body.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      setQuery("");
      setActive(0);
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  function go(item: NavItem | undefined): void {
    if (!item) return;
    onClose();
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent): void {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(activeIndex + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[activeIndex]);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: { sx: { borderRadius: "var(--radius-lg)", position: "fixed", top: "12vh", m: 0 } },
        backdrop: { sx: { backgroundColor: "color-mix(in oklch, var(--ink-strong) 32%, transparent)" } },
      }}
      aria-label="ค้นหาและไปยังหน้า"
    >
      <div className="flex items-center gap-2.5 px-4" style={{ borderBottom: "1px solid var(--line)" }}>
        <Icon name="search" sx={{ fontSize: 20, color: "var(--faint)" }} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="ไปยังหน้า… (พิมพ์ชื่อเมนู)"
          aria-label="ค้นหาเมนู"
          className="w-full bg-transparent py-3.5 text-[15px] text-ink outline-none placeholder:text-faint"
        />
        <kbd className="hidden shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted sm:block" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--line)" }}>
          Esc
        </kbd>
      </div>

      {results.length > 0 ? (
        <ul className="max-h-[52vh] overflow-y-auto p-2">
          {results.map((item, i) => {
            const isActive = i === activeIndex;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => go(item)}
                  onMouseEnter={() => setActive(i)}
                  className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors"
                  style={{ backgroundColor: isActive ? "var(--brand-soft)" : "transparent", color: isActive ? "var(--brand-ink)" : "var(--ink)" }}
                >
                  <Icon name={item.icon} sx={{ fontSize: 19, color: isActive ? "var(--brand-strong)" : "var(--muted)" }} />
                  <span className="flex-1 text-[14px] font-medium">{item.label}</span>
                  {isActive && <Icon name="arrow_forward" sx={{ fontSize: 16, color: "var(--brand-strong)" }} />}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-4 py-10 text-center text-[13.5px] text-muted">ไม่พบเมนูที่ตรงกับ “{query}”</p>
      )}
    </Dialog>
  );
}
