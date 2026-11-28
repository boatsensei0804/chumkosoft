import Mascot from "@/components/ui/mascot";
import { cn } from "@/lib/utils";

export default function BrandMark({ inverse = false }: { inverse?: boolean }): React.ReactNode {
  return (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      <span className={cn(
        "grid size-11 shrink-0 place-items-center rounded-xl border",
        inverse ? "border-nav-line bg-nav-hover" : "border-line bg-sky-accent-soft",
      )}>
        <Mascot pose="welcome" size={40} priority decorative />
      </span>
      <span className="min-w-0">
        <span className={cn("block truncate text-[17px] font-bold leading-tight", inverse ? "text-white" : "text-ink-strong")}>
          Chumkosoft
        </span>
        <span className={cn("block truncate text-[11px] leading-tight", inverse ? "text-nav-muted" : "text-muted")}>ระบบโรงเรียน</span>
      </span>
    </span>
  );
}
