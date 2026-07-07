import type { EnrolmentStatus } from "../types";

interface StatusConfig {
  label: string;
  dot: string;
  bg: string;
  fg: string;
}

const config: Record<EnrolmentStatus, StatusConfig> = {
  active: { label: "กำลังศึกษา", dot: "var(--success)", bg: "var(--success-soft)", fg: "oklch(0.42 0.1 152)" },
  pending: { label: "รออนุมัติ", dot: "var(--warning)", bg: "var(--warning-soft)", fg: "oklch(0.5 0.12 55)" },
  leave: { label: "ลาพักการเรียน", dot: "var(--faint)", bg: "var(--surface-sunken)", fg: "var(--muted)" },
};

interface StatusChipProps {
  status: EnrolmentStatus;
}

export default function StatusChip({ status }: StatusChipProps): React.ReactNode {
  const c = config[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold"
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: c.dot }} aria-hidden="true" />
      {c.label}
    </span>
  );
}
