import type { ReactNode } from "react";
import BrandScene from "@/components/ui/brand-scene";
import type { MascotPose } from "@/components/ui/mascot";
import { cn } from "@/lib/utils";

export default function PageHeader({
  title, subtitle, actions, compact = false, pose = "welcome",
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  compact?: boolean;
  pose?: MascotPose;
}): ReactNode {
  return (
    <header className="relative isolate mb-5 overflow-hidden rounded-2xl border border-school-panel-border bg-school-panel-tint sm:mb-6">
      <div className="absolute inset-0 -z-10">
        <BrandScene pose={pose} banner priority />
      </div>
      <div className={cn(
        "flex min-h-28 flex-col justify-center gap-3 px-4 py-4 sm:w-[64%] sm:px-6 lg:px-7",
        compact ? "sm:min-h-32" : "sm:min-h-40 sm:py-5",
      )}>
        <div className="min-w-0 pr-24 sm:pr-0">
          <h1 className={cn("font-bold leading-tight text-ink-strong", compact ? "text-2xl" : "text-3xl sm:text-4xl")}>{title}</h1>
          {subtitle && <p className="mt-1.5 max-w-[70ch] text-pretty text-sm leading-relaxed text-brand-ink">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
