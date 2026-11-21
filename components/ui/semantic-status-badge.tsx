import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "neutral";
const tones: Record<Tone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
};

export default function SemanticStatusBadge({ children, tone, className }: { children: ReactNode; tone: Tone; className?: string }): ReactNode {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", tones[tone], className)}><span aria-hidden="true" className="size-1.5 rounded-full bg-current" />{children}</span>;
}
