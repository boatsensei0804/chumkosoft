"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Tooltip from "@mui/material/Tooltip";
import Icon from "./icon";
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
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = item.available && isActive(pathname, item.href);

        if (!item.available) {
          return (
            <li key={item.key}>
              <Tooltip title="กำลังพัฒนา" placement="right" arrow>
                <span
                  className="flex cursor-not-allowed items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] font-medium text-faint select-none"
                  aria-disabled="true"
                >
                  <Icon name={item.icon} sx={{ fontSize: 20 }} />
                  <span className="flex-1">{item.label}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: "var(--surface-sunken)", color: "var(--faint)" }}
                  >
                    เร็ว ๆ นี้
                  </span>
                </span>
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
              className="group relative flex items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] font-medium transition-colors"
              style={{
                backgroundColor: active ? "var(--brand-soft)" : "transparent",
                color: active ? "var(--brand-ink)" : "var(--ink)",
              }}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full"
                  style={{ backgroundColor: "var(--brand)" }}
                  aria-hidden="true"
                />
              )}
              <Icon
                name={item.icon}
                sx={{ fontSize: 20, color: active ? "var(--brand-strong)" : "var(--muted)" }}
              />
              <span className="flex-1">{item.label}</span>
              {typeof item.badge === "number" && (
                <span
                  className="tabular rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
                  style={{
                    backgroundColor: active ? "var(--brand)" : "var(--surface-sunken)",
                    color: active ? "var(--on-primary)" : "var(--muted)",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
