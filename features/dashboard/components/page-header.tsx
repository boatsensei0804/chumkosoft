import type { ReactNode } from "react";
import Mascot, { type MascotPose } from "@/components/ui/mascot";
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
    <header className="@container mb-5 border-b border-line pb-5 sm:mb-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft sm:size-14">
            <Mascot pose={pose} size={64} decorative className="size-full" />
          </div>
          <div className="min-w-0">
            <h1 className={cn("text-pretty wrap-anywhere font-bold leading-[1.22] tracking-tight text-ink-strong", compact ? "text-2xl" : "text-2xl @lg:text-3xl")}>{title}</h1>
            {subtitle && <p className="mt-1 max-w-[65ch] text-pretty text-sm leading-relaxed text-muted">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex min-w-0 flex-wrap items-center gap-2 [&_a]:min-h-11 [&_button]:min-h-11">{actions}</div>}
      </div>
    </header>
  );
}
