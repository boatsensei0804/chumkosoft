"use client";

import { useRouter } from "next/navigation";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { NavItem } from "../types";

interface CommandPaletteProps {
  open: boolean;
  items: NavItem[];
  onClose: () => void;
}

/**
 * ⌘K command palette: fuzzy-filter navigable destinations and jump with the
 * keyboard. Delivers on the ⌘K affordance shown in the top bar and gives staff a
 * fast path between the many management surfaces. cmdk handles filtering, arrow
 * navigation, Enter, and dialog a11y natively.
 */
export default function CommandPalette({ open, items, onClose }: CommandPaletteProps): React.ReactNode {
  const router = useRouter();

  function go(href: string): void {
    onClose();
    router.push(href);
  }

  return (
    <CommandDialog open={open} onOpenChange={(next) => !next && onClose()} title="ค้นหาและไปยังหน้า" description="พิมพ์ชื่อเมนูเพื่อไปยังหน้า">
      <CommandInput placeholder="ไปยังหน้า… (พิมพ์ชื่อเมนู)" />
      <CommandList>
        <CommandEmpty>ไม่พบเมนูที่ตรงกับที่ค้นหา</CommandEmpty>
        <CommandGroup heading="เมนู">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem key={item.key} value={`${item.label} ${item.href}`} onSelect={() => go(item.href)}>
                <Icon className="size-[18px] text-muted" />
                <span className="font-medium">{item.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
