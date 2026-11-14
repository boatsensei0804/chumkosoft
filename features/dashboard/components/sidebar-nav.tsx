"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { NavItem } from "../types";

interface SidebarNavProps {
  items: NavItem[];
  onNavigate?: () => void;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SidebarNav({ items, onNavigate }: SidebarNavProps): React.ReactNode {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={200}>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => {
          const active = item.available && isActive(pathname, item.href);
          const Icon = item.icon;

          if (!item.available) {
            return (
              <li key={item.key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-faint select-none"
                      aria-disabled="true"
                    >
                      <Icon className="size-5" />
                      <span className="flex-1">{item.label}</span>
                      <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[10px] font-semibold text-faint">เร็ว ๆ นี้</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right">กำลังพัฒนา</TooltipContent>
                </Tooltip>
              </li>
            );
          }

          return (
            <li key={item.key}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 min-h-11 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all",
                  active ? "bg-brand text-white shadow-[0_4px_12px_#2563eb25]" : "text-ink hover:bg-surface-sunken",
                )}
              >
                {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-white/70" aria-hidden="true" />}
                <Icon className={cn("size-5", active ? "text-white" : "text-muted")} />
                <span className="flex-1">{item.label}</span>
                {typeof item.badge === "number" && (
                  <span
                    className={cn(
                      "tabular rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                      active ? "bg-brand text-[var(--on-primary)]" : "bg-surface-sunken text-muted",
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </TooltipProvider>
  );
}
