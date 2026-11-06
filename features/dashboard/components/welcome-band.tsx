import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";

interface WelcomeBandProps {
  greeting: string;
  subtitle: string;
  term: string;
  date: string;
}

/*
  The letterhead band — the one bold surface. A deep institutional-blue gradient
  with a faint guilloché line pattern (security-paper / diploma vernacular) and a
  soft gold glow, tying the gold identity to the blue tone. Everything below it
  stays calm white + gold.
*/
export default function WelcomeBand({
  greeting,
  subtitle,
  term,
  date,
}: WelcomeBandProps): React.ReactNode {
  return (
    <section
      className="relative overflow-hidden rounded-xl px-5 py-5 sm:px-7 sm:py-6"
      style={{ background: "var(--band-from)" }}
    >
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold"
              style={{ backgroundColor: "color-mix(in oklch, var(--band-ink) 14%, transparent)", color: "var(--band-ink)" }}
            >
              <span className="size-1.5 rounded-full" style={{ backgroundColor: "var(--brand)" }} aria-hidden="true" />
              {term}
            </span>
            <span className="tabular inline-flex items-center gap-1.5 text-[12.5px]" style={{ color: "var(--band-muted)" }}>
              <CalendarDays className="size-[15px]" />
              {date}
            </span>
          </div>

          <h1
            className="mt-3.5 text-[26px] font-bold leading-tight tracking-tight sm:text-[30px]"
            style={{ color: "var(--band-ink)", textWrap: "balance" }}
          >
            {greeting}
          </h1>
          <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed" style={{ color: "var(--band-muted)" }}>
            {subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/dashboard/students"
            className="inline-flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-[14px] font-semibold transition-transform hover:-translate-y-px"
            style={{ backgroundColor: "var(--band-ink)", color: "var(--band-from)" }}
          >
            <Plus className="size-[18px]" />
            เพิ่มนักเรียน
          </Link>
        </div>
      </div>
    </section>
  );
}
