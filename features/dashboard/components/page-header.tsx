import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps): React.ReactNode {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div className="min-w-0">
        <h1
          className="text-[25px] font-bold tracking-tight text-ink-strong sm:text-[29px]"
          style={{ textWrap: "balance" }}
        >
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 max-w-3xl text-[14px] leading-relaxed text-muted">{subtitle}</p>}
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
        {actions}
      </div>
    </div>
  );
}
