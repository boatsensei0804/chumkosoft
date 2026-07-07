interface BrandMarkProps {
  showWordmark?: boolean;
}

export default function BrandMark({ showWordmark = true }: BrandMarkProps): React.ReactNode {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="grid size-9 shrink-0 place-items-center rounded-[10px]"
        style={{
          backgroundImage: "linear-gradient(150deg, var(--brand) 0%, var(--brand-strong) 100%)",
          boxShadow: "0 2px 6px oklch(0.45 0.15 254 / 0.35)",
        }}
        aria-hidden="true"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" role="presentation">
          <path
            d="M12 4L21 8.2L12 12.4L3 8.2L12 4Z"
            fill="var(--on-primary)"
          />
          <path
            d="M6.6 10.4V14.2C6.6 15.9 9 17 12 17C15 17 17.4 15.9 17.4 14.2V10.4"
            stroke="var(--on-primary)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
          <path
            d="M20.4 8.6V13"
            stroke="var(--on-primary)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-bold tracking-tight text-ink-strong">chumkosoft</span>
          <span className="mt-0.5 text-[11px] font-medium text-muted">ระบบบริหารโรงเรียน</span>
        </span>
      )}
    </div>
  );
}
