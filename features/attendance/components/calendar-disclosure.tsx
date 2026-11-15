"use client";

import { useId, useState, type ReactNode } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";

/** Keep the monthly calendar visible on desktop without occupying the mobile screen. */
export default function CalendarDisclosure({ children }: { children: ReactNode }): ReactNode {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <><button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} className="flex min-h-12 w-full items-center gap-2 px-4 py-3 text-left text-xs font-semibold text-brand-ink lg:hidden"><CalendarDays className="size-4" /><span className="flex-1">{open ? "ซ่อนปฏิทินรายเดือน" : "แสดงปฏิทินเพื่อเลือกวัน"}</span><ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} /></button><div id={id} className={open ? "block" : "hidden lg:block"}>{children}</div></>;
}
