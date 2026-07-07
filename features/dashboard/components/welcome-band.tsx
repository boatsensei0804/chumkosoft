import Link from "next/link";
import Icon from "./icon";

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
      className="relative overflow-hidden rounded-[20px] px-6 py-6 sm:px-8 sm:py-7"
      style={{
        background: "linear-gradient(115deg, var(--band-from) 0%, var(--band-to) 100%)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      {/* Guilloché line pattern */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id="guilloche" width="128" height="22" patternUnits="userSpaceOnUse">
            <path d="M0 11 Q 32 -1 64 11 T 128 11" fill="none" stroke="var(--band-line)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#guilloche)" />
      </svg>

      {/* Soft gold glow, top-right — ties gold to the blue band */}
      <div
        className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full"
        style={{ background: "radial-gradient(circle, var(--brand) 0%, transparent 62%)", opacity: 0.22 }}
        aria-hidden="true"
      />

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
              <Icon name="calendar" sx={{ fontSize: 15 }} />
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

        <div className="flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-[14px] font-semibold transition-colors"
            style={{ border: "1px solid var(--band-line)", color: "var(--band-ink)" }}
          >
            <Icon name="download" sx={{ fontSize: 18 }} />
            ส่งออกรายงาน
          </button>
          <Link
            href="/dashboard/students"
            className="inline-flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-[14px] font-semibold transition-transform hover:-translate-y-px"
            style={{ backgroundColor: "var(--band-ink)", color: "var(--band-from)" }}
          >
            <Icon name="add" sx={{ fontSize: 18 }} />
            เพิ่มนักเรียน
          </Link>
        </div>
      </div>
    </section>
  );
}
