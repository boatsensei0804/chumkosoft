import type { ReactNode } from "react";

interface MobileRecordCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  fields?: { label: string; value: ReactNode }[];
  actions: ReactNode;
}

/** A readable alternative to sideways-scrolling registry tables on narrow screens. */
export default function MobileRecordCard({ title, subtitle, badge, fields = [], actions }: MobileRecordCardProps): ReactNode {
  return (
    <article className="rounded-xl border border-line bg-bg p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-sm font-bold text-ink-strong">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
        </div>
        {badge}
      </div>
      {fields.length > 0 && <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3">
        {fields.map(({ label, value }) => <div key={label} className="min-w-0"><dt className="text-[11px] text-muted">{label}</dt><dd className="break-words text-[13px] font-medium text-ink">{value}</dd></div>)}
      </dl>}
      <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">{actions}</div>
    </article>
  );
}
