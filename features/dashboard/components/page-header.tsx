import type { ReactNode } from "react";
import BrandScene from "@/components/ui/brand-scene";
import type { MascotPose } from "@/components/ui/mascot";
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
      "relative isolate mb-6 overflow-hidden rounded-xl border sm:mb-7",
      featured ? "border-nav-line bg-nav-surface text-nav-ink" : "border-line bg-card",
    )}>
      <div className="absolute inset-0 -z-10">
        <BrandScene pose={pose} banner priority />
      </div>
      <div className={cn(
        "flex min-h-28 flex-col justify-center gap-3 px-4 py-4 sm:w-[65%] sm:px-6 lg:px-7",
        featured && "sm:min-h-48 sm:py-7",
        !featured && !compact && "sm:min-h-34",
      )}>
        <div className="min-w-0 pr-24 sm:pr-0">
          <h1 className={cn(
            "text-pretty font-bold leading-tight",
            compact ? "text-2xl" : "text-3xl sm:text-4xl",
            featured ? "text-nav-ink" : "text-ink-strong",
          )}>{title}</h1>
          {subtitle && <p className={cn("mt-1.5 max-w-[65ch] text-pretty text-sm leading-relaxed", featured ? "text-nav-muted" : "text-muted")}>{subtitle}</p>}
        </div>
        {actions && <div className={cn(
          "flex flex-wrap items-center gap-2",
          featured && "[&_[data-variant=default]]:bg-sky-accent [&_[data-variant=default]]:text-sky-accent-ink [&_[data-variant=default]:hover]:bg-sky-accent-soft [&_:focus-visible]:outline-sky-accent",
        )}>{actions}</div>}
      </div>
    </header>
  );
}
