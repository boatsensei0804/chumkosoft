import Link from "next/link";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import Mascot from "@/components/ui/mascot";

export default function WelcomeBand({ greeting, subtitle, term, date }: { greeting: string; subtitle: string; term: string; date: string }): React.ReactNode {
  return <section className="relative overflow-hidden rounded-[28px] border border-blue-100 bg-[#eaf5ff]">
    <div className="absolute -right-12 -top-28 size-80 rounded-full border-[48px] border-white/45" aria-hidden="true" />
    <div className="relative flex items-center justify-between gap-5 px-5 py-6 sm:px-7">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-3 text-xs"><span className="rounded-full bg-white px-3 py-1.5 font-semibold text-brand-ink">{term}</span><span className="inline-flex items-center gap-1.5 text-muted"><CalendarDays className="size-3.5" />{date}</span></div><h1 className="mt-4 text-[clamp(1.5rem,3vw,2.1rem)] font-bold leading-tight tracking-tight text-ink-strong">{greeting}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{subtitle}</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/dashboard/attendance?mode=homeroom" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white">เช็คชื่อประจำห้อง <ArrowUpRight className="size-4" /></Link><Link href="/dashboard/students" className="inline-flex min-h-10 items-center rounded-xl border border-blue-200 bg-white px-4 text-sm font-semibold text-brand-ink">ค้นหานักเรียน</Link></div></div>
      <Mascot pose="working" size={170} decorative priority className="hidden md:block" />
    </div>
  </section>;
}
