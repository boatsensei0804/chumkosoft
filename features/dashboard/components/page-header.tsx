import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps): React.ReactNode {
  return (
    <div className="relative mb-6 flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-[22px] border border-blue-100 bg-gradient-to-r from-white via-white to-blue-50 p-5 shadow-[0_4px_20px_#16487806] sm:p-7">
      <div className="min-w-0 border-l-4 border-brand pl-4">
        <h1
          className="text-[26px] font-bold tracking-tight text-ink-strong sm:text-[32px]"
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
