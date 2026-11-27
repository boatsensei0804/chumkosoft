import type { ReactNode } from "react";

export default function PageHeader({
  title, subtitle, actions, compact = false,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  compact?: boolean;
}): ReactNode {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line pb-4">
      <div className="min-w-0">
        <h1 className={compact ? "text-2xl font-bold leading-tight text-ink-strong" : "text-2xl font-bold leading-tight text-ink-strong sm:text-3xl"}>{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-[70ch] text-sm leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
