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
      className={`school-card flex flex-col overflow-hidden rounded-[20px] ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-[15px] font-bold tracking-tight text-ink-strong">{title}</h2>
          {caption && <p className="mt-0.5 text-[12.5px] text-muted">{caption}</p>}
        </div>
        {action}
      </div>
      <div className={`border-t border-school-panel-border ${bodyClassName}`}>
        {children}
      </div>
    </section>
  );
}
