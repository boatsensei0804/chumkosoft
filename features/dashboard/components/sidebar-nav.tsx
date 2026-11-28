"use client";

import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { NavItem } from "../types";

interface SidebarNavProps {
  items: NavItem[];
  activeKey?: string;
  onNavigate?: () => void;
}

export default function SidebarNav({ items, activeKey, onNavigate }: SidebarNavProps): React.ReactNode {
  return (
    <TooltipProvider delayDuration={200}>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = item.available && item.key === activeKey;
          const Icon = item.icon;

          if (!item.available) {
            return (
              <li key={item.key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-nav-muted select-none"
                      aria-disabled="true"
                    >
                      <Icon className="size-5" />
                      <span className="flex-1">{item.label}</span>
                      <span className="rounded-full bg-nav-hover px-2 py-0.5 text-[10px] font-semibold text-nav-muted">เร็ว ๆ นี้</span>
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
                  "group relative flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold motion-safe:transition-colors",
                  active ? "bg-white text-nav-surface before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-sky-accent" : "text-nav-ink hover:bg-nav-hover",
                )}
              >
                <Icon aria-hidden="true" className={cn("size-[18px] shrink-0", active ? "text-sky-accent-ink" : "text-nav-muted")} />
                <span className="flex-1">{item.label}</span>
                {typeof item.badge === "number" && (
                  <span
                    className={cn(
                      "tabular rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                      active ? "bg-sky-accent text-sky-accent-ink" : "bg-nav-hover text-nav-muted",
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
