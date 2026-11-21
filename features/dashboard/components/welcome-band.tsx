import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, CalendarDays } from "lucide-react";

export default function WelcomeBand({ greeting, subtitle, term, date }: { greeting: string; subtitle: string; term: string; date: string }): React.ReactNode {
  return <section className="relative overflow-hidden rounded-[24px] border border-blue-100 bg-[#eaf5ff] shadow-[0_8px_24px_#225a9a12]">
    <Image src="/mascot/overview-scene.webp" alt="" fill priority sizes="(min-width: 1280px) 1200px, 100vw" className="pointer-events-none object-cover object-center" />
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/75 via-white/35 to-transparent" />
    <div className="relative flex min-h-[170px] items-center justify-between gap-5 px-5 py-4 sm:px-7">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-3 text-xs"><span className="rounded-full bg-white px-3 py-1.5 font-semibold text-brand-ink">{term}</span><span className="inline-flex items-center gap-1.5 text-muted"><CalendarDays className="size-3.5" />{date}</span></div><h1 className="mt-4 text-[clamp(1.5rem,3vw,2.1rem)] font-bold leading-tight tracking-tight text-ink-strong">{greeting}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{subtitle}</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/dashboard/attendance?mode=homeroom" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white">เช็คชื่อประจำห้อง <ArrowUpRight className="size-4" /></Link><Link href="/dashboard/students" className="inline-flex min-h-10 items-center rounded-xl border border-blue-200 bg-white px-4 text-sm font-semibold text-brand-ink">ค้นหานักเรียน</Link></div></div>
    </div>
  </section>;
}
