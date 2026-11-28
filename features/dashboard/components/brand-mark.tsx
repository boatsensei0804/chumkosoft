import Mascot from "@/components/ui/mascot";
import { cn } from "@/lib/utils";

export default function BrandMark({ inverse = false }: { inverse?: boolean }): React.ReactNode {
  return (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      <span className={cn(
        "grid size-11 shrink-0 place-items-center rounded-xl border",
        inverse ? "border-white/20 bg-white/10" : "border-amber-200 bg-amber-50",
      )}>
        <Mascot pose="welcome" size={40} decorative />
      </span>
      <span className="min-w-0">
        <span className={cn("block truncate text-[17px] font-bold leading-tight", inverse ? "text-white" : "text-ink-strong")}>
          Chumkosoft
        </span>
        <span className={cn("block truncate text-[11px] leading-tight", inverse ? "text-blue-100" : "text-muted")}>ระบบโรงเรียน</span>
      </span>
    </span>
  );
}
