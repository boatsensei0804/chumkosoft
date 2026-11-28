import { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  caption?: string;
  action?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  className?: string;
}

export default function SectionCard({
  title,
  caption,
  action,
  children,
  bodyClassName = "p-5",
  className = "",
}: SectionCardProps): React.ReactNode {
  return (
    <section
      className={`flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-school-panel ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="wrap-anywhere text-base font-bold tracking-tight text-ink-strong">{title}</h2>
          {caption && <p className="mt-1 wrap-anywhere text-sm leading-relaxed text-muted">{caption}</p>}
        </div>
        {action}
      </div>
      <div className={`border-t border-line ${bodyClassName}`}>
        {children}
      </div>
    </section>
  );
}
