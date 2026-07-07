"use client";

import { ReactNode } from "react";

interface LabeledInputProps {
  label: string;
  type?: "text" | "date" | "time" | "number";
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export function LabeledInput({ label, type = "text", value, onChange, className = "" }: LabeledInputProps): React.ReactNode {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[12px] font-medium text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="tabular w-full rounded-[10px] px-3 py-2 text-[14px] font-medium text-ink outline-none transition-colors"
        style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line-strong)" }}
      />
    </label>
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

export function Switch({ checked, onChange, label }: SwitchProps): React.ReactNode {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
      style={{ backgroundColor: checked ? "var(--brand)" : "var(--surface-sunken)" }}
    >
      <span
        className="inline-block size-5 rounded-full bg-white shadow-sm transition-transform"
        style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

interface SegmentedProps {
  options: { value: string; label: string; icon?: ReactNode }[];
  value: string;
  onChange: (v: string) => void;
}

export function Segmented({ options, value, onChange }: SegmentedProps): React.ReactNode {
  return (
    <div
      role="tablist"
      className="inline-flex gap-1 rounded-[12px] p-1"
      style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--line)" }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className="inline-flex items-center gap-2 rounded-[9px] px-4 py-2 text-[13.5px] font-semibold transition-colors"
            style={{
              backgroundColor: active ? "var(--bg)" : "transparent",
              color: active ? "var(--brand-ink)" : "var(--muted)",
              boxShadow: active ? "var(--shadow-sm)" : "none",
            }}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
