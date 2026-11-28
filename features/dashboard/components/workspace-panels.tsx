"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export default function WorkspacePanels({ sections }: { sections: { title: string; description: string; content: ReactNode }[] }): ReactNode {
  const [active, setActive] = useState(0);
  const id = useId();
  return <div className="grid items-start gap-5 lg:grid-cols-[230px_minmax(0,1fr)]"><nav aria-label="หมวดการจัดการ" className="rounded-2xl school-card p-2"><div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">{sections.map((section, index) => <button key={section.title} type="button" aria-pressed={index === active} aria-controls={`${id}-${index}`} onClick={() => setActive(index)} className={`flex min-h-12 items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${active === index ? "bg-brand text-white shadow-sm" : "text-muted hover:bg-blue-50"}`}><span><span className="block text-sm font-semibold">{section.title}</span><span className={`mt-1 hidden text-xs leading-5 lg:block ${active === index ? "text-blue-100" : "text-muted"}`}>{section.description}</span></span><ChevronRight aria-hidden="true" className="size-4 shrink-0" /></button>)}</div></nav><div className="min-w-0">{sections.map((section, index) => <section key={section.title} id={`${id}-${index}`} hidden={active !== index} aria-label={section.title}>{section.content}</section>)}</div></div>;
}
