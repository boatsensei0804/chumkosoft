import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps): React.ReactNode {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1
          className="text-[22px] font-semibold tracking-tight text-ink-strong sm:text-[23px]"
          style={{ textWrap: "balance" }}
        >
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
