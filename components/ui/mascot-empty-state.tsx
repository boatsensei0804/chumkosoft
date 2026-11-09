import type { ReactNode } from "react";
import Mascot, { type MascotPose } from "./mascot";

interface MascotEmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  pose?: MascotPose;
  compact?: boolean;
  className?: string;
}

export default function MascotEmptyState({ title, description, action, pose = "empty", compact = false, className = "" }: MascotEmptyStateProps): React.ReactNode {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-brand-softer px-5 text-center ${compact ? "py-6" : "py-10"} ${className}`}>
      <Mascot pose={pose} size={compact ? 88 : 128} decorative />
      <h3 className="mt-2 text-[14px] font-semibold text-ink-strong">{title}</h3>
      {description && <p className="mt-1 max-w-md text-[12.5px] leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
