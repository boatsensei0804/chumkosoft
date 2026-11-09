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
      className={`flex flex-col overflow-hidden rounded-[20px] ${className}`}
      style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "var(--shadow-md)" }}
    >
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
        <div>
          <h2 className="text-[15px] font-bold tracking-tight text-ink-strong">{title}</h2>
          {caption && <p className="mt-0.5 text-[12.5px] text-muted">{caption}</p>}
        </div>
        {action}
      </div>
      <div className={bodyClassName} style={{ borderTop: "1px solid var(--line)" }}>
        {children}
      </div>
    </section>
  );
}
