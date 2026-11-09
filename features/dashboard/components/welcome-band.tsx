import Link from "next/link";
import { ArrowRight, CalendarDays, CalendarRange, MessageSquare, ScanFace } from "lucide-react";
import Mascot from "@/components/ui/mascot";

interface WelcomeBandProps {
  greeting: string;
  subtitle: string;
  term: string;
  date: string;
}

const dailyWork = [
  { href: "/dashboard/timetable", label: "ตารางสอน", detail: "ดูแผนรายห้องและรายครู", icon: CalendarRange },
  { href: "/dashboard/faces", label: "ชุดข้อมูลใบหน้า", detail: "ตรวจข้อมูลสำหรับจุดสแกน", icon: ScanFace },
  { href: "/dashboard/line", label: "แจ้งผู้ปกครอง", detail: "ติดตามการสื่อสารผ่าน LINE", icon: MessageSquare },
] as const;

export default function WelcomeBand({ greeting, subtitle, term, date }: WelcomeBandProps): React.ReactNode {
  return (
    <section className="relative isolate overflow-hidden rounded-[24px] border border-brand/15 bg-gradient-to-br from-[#eaf6ff] via-[#f6fbff] to-white shadow-sm">
      <div className="pointer-events-none absolute -left-20 -top-24 size-64 rounded-full bg-white/60 blur-3xl" aria-hidden="true" />
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.85fr)] lg:items-stretch lg:gap-10 lg:p-9">
        <div className="relative flex min-w-0 flex-col items-start justify-center">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full border border-brand/15 bg-white px-3 py-1.5 text-brand-ink shadow-sm">{term}</span>
            <span className="inline-flex items-center gap-1.5 px-1 text-muted"><CalendarDays className="size-4" />{date}</span>
          </div>
          <h1 className="mt-5 max-w-xl text-[clamp(1.7rem,3vw,2.55rem)] font-bold leading-tight tracking-tight text-ink-strong">
            {greeting}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-muted sm:text-base">{subtitle}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/dashboard/attendance" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
              ดูการเช็คชื่อวันนี้ <ArrowRight className="size-4" />
            </Link>
            <Link href="/dashboard/students" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand/20 bg-white px-5 py-2.5 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-softer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
              ค้นหานักเรียน
            </Link>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#183763] to-[#28679e] p-5 text-white shadow-lg sm:p-6">
          <div className="relative z-10 max-w-[calc(100%-112px)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-200">CHUMKOSOFT WORKSPACE</p>
            <h2 className="mt-1 text-lg font-bold">เริ่มงานวันนี้</h2>
            <p className="mt-1 text-xs leading-5 text-sky-100">ทางลัดสำหรับงานที่ใช้บ่อยในโรงเรียน</p>
          </div>
          <Mascot pose="working" size={122} decorative priority className="pointer-events-none absolute -right-2 -top-3 z-0" />
          <div className="relative z-10 mt-5 space-y-2">
            {dailyWork.map(({ href, label, detail, icon: Icon }) => (
              <Link key={href} href={href} className="group flex min-h-16 items-center gap-3 rounded-xl border border-white/15 bg-white/95 px-3.5 py-2.5 text-ink-strong shadow-sm transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink"><Icon className="size-[18px]" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{label}</span><span className="block truncate text-xs text-muted">{detail}</span></span>
                <ArrowRight className="size-4 shrink-0 text-brand-ink transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
