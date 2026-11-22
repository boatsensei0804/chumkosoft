import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, CalendarDays } from "lucide-react";

export default function WelcomeBand({ greeting, subtitle, term, date }: { greeting: string; subtitle: string; term: string; date: string }): React.ReactNode {
  return <section className="relative overflow-hidden rounded-[24px] border border-school-panel-border bg-gradient-to-r from-school-panel via-school-panel-tint to-school-panel-wash shadow-school-panel">
    <div className="relative z-10 flex items-center px-5 py-4 sm:min-h-[190px] sm:w-[56%] sm:px-7">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-3 text-xs"><span className="rounded-full bg-white px-3 py-1 font-semibold text-brand-ink">{term}</span><span className="inline-flex items-center gap-1.5 text-muted"><CalendarDays className="size-3.5" />{date}</span></div><h1 className="mt-2 text-[clamp(1.5rem,2.3vw,2rem)] font-bold leading-tight tracking-tight text-ink-strong">{greeting}</h1><p className="mt-1 max-w-2xl text-[13px] leading-5 text-muted">{subtitle}</p><div className="mt-2 flex flex-wrap gap-2"><Link href="/dashboard/attendance?mode=homeroom" className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white">เช็คชื่อประจำห้อง <ArrowUpRight className="size-4" /></Link><Link href="/dashboard/students" className="inline-flex min-h-9 items-center rounded-xl border border-blue-200 bg-white px-4 text-sm font-semibold text-brand-ink">ค้นหานักเรียน</Link></div></div>
    </div>
    <div className="pointer-events-none relative ml-auto aspect-[3/1] w-full max-w-[570px] [mask-image:linear-gradient(to_bottom,transparent,black_24%)] sm:absolute sm:top-1/2 sm:right-0 sm:w-[58%] sm:-translate-y-1/2 sm:[mask-image:linear-gradient(to_right,transparent,black_30%)]">
      <Image src="/mascot/dashboard-overview-soft.webp" alt="" fill preload sizes="(min-width: 1024px) 48vw, (min-width: 640px) 58vw, 100vw" className="object-contain object-right" />
    </div>
  </section>;
}
