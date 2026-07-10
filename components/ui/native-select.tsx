"use client";

import { cn } from "@/lib/utils";

interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

/**
 * Native <select> styled to match shadcn inputs. Used inside <form action> forms
 * where a plain FormData submission (including an empty "ไม่ระบุ" option) matters —
 * Radix Select can't submit an empty value.
 */
export function NativeSelect({ className, invalid, ...props }: NativeSelectProps): React.ReactNode {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(
        "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-[color,box-shadow]",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        invalid && "border-destructive ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}
