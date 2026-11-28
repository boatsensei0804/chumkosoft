import type { ReactNode } from "react";
import BrandScene from "@/components/ui/brand-scene";
import Mascot, { type MascotPose } from "@/components/ui/mascot";
import { cn } from "@/lib/utils";

export default function PageHeader({
  title, subtitle, actions, compact = false, pose = "welcome", featured = false,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  compact?: boolean;
  pose?: MascotPose;
  featured?: boolean;
}): ReactNode {
  return (
    <header className={cn(
      "relative isolate mb-5 overflow-hidden sm:mb-6",
      featured ? "rounded-2xl border border-nav-line bg-nav-surface text-nav-ink" : "border-b border-line",
    )}>
      {featured && <div className="absolute inset-0 -z-10"><BrandScene pose={pose} banner priority /></div>}
      <div className={cn(
        "flex items-center justify-between gap-4 sm:gap-6",
        featured ? "min-h-28 px-4 py-4 sm:min-h-44 sm:w-[68%] sm:px-6 sm:py-6 lg:px-7" : "min-h-24 pt-1 pb-4 sm:min-h-32 sm:pb-5",
      )}>
        <div className="min-w-0">
          <div className={cn(featured && "pr-20 sm:pr-0")}>
            <h1 className={cn(
              "text-pretty font-bold leading-tight",
              compact ? "text-2xl sm:text-[2rem]" : "text-3xl sm:text-4xl",
              featured ? "text-nav-ink" : "text-ink-strong",
            )}>{title}</h1>
            {subtitle && <p className={cn("mt-1.5 max-w-[65ch] text-pretty text-sm leading-relaxed", featured ? "text-nav-muted" : "text-muted")}>{subtitle}</p>}
          </div>
          {actions && <div className={cn(
            "mt-3 flex flex-wrap items-center gap-2",
            featured && "[&_[data-variant=default]]:bg-sky-accent [&_[data-variant=default]]:text-sky-accent-ink [&_[data-variant=default]:hover]:bg-sky-accent-soft [&_:focus-visible]:outline-sky-accent",
          )}>{actions}</div>}
        </div>
        {!featured && (
          <div className="grid size-17 shrink-0 place-items-center rounded-full bg-brand-soft/80 sm:size-26">
            <Mascot pose={pose} size={132} decorative className="size-[108%] max-w-none" />
          </div>
        )}
      </div>
    </header>
  );
}
