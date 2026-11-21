import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, CalendarDays } from "lucide-react";

export default function WelcomeBand({ greeting, subtitle, term, date }: { greeting: string; subtitle: string; term: string; date: string }): React.ReactNode {
  return <section className="relative overflow-hidden rounded-[24px] border border-[#a5d9ff] bg-gradient-to-r from-[#e7f6ff] via-[#c8ebff] to-[#79caff] shadow-[0_9px_24px_#1b77bf24]">
    <Image src="/mascot/dashboard-overview.webp" alt="" width={2172} height={724} priority sizes="(min-width: 1280px) 650px, 100vw" className="pointer-events-none absolute right-0 top-0 h-full w-auto max-w-none [mask-image:linear-gradient(to_right,transparent_0%,black_28%)]" />
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#e7f6ff]/95 via-[#d9f1ff]/75 to-transparent md:from-[#e7f6ff]/75 md:via-[#d9f1ff]/25" />
    <div className="relative flex min-h-[190px] items-center justify-between gap-5 px-5 py-4 sm:px-7">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-3 text-xs"><span className="rounded-full bg-white px-3 py-1 font-semibold text-brand-ink">{term}</span><span className="inline-flex items-center gap-1.5 text-muted"><CalendarDays className="size-3.5" />{date}</span></div><h1 className="mt-2 text-[clamp(1.5rem,2.3vw,2rem)] font-bold leading-tight tracking-tight text-ink-strong">{greeting}</h1><p className="mt-1 max-w-2xl text-[13px] leading-5 text-muted">{subtitle}</p><div className="mt-2 flex flex-wrap gap-2"><Link href="/dashboard/attendance?mode=homeroom" className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white">เช็คชื่อประจำห้อง <ArrowUpRight className="size-4" /></Link><Link href="/dashboard/students" className="inline-flex min-h-9 items-center rounded-xl border border-blue-200 bg-white px-4 text-sm font-semibold text-brand-ink">ค้นหานักเรียน</Link></div></div>
    </div>
  </section>;
}
