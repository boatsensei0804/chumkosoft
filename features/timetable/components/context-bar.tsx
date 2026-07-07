"use client";

import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Icon from "@/features/dashboard/components/icon";
import type { ContextOption } from "../types";

interface ContextBarProps {
  terms: ContextOption[];
  termId: string;
  onTermChange: (v: string) => void;
  classrooms: ContextOption[];
  classroomId: string;
  onClassroomChange: (v: string) => void;
  placed: number;
  total: number;
}

const selectSx = {
  minWidth: 150,
  backgroundColor: "var(--bg)",
  borderRadius: "10px",
  fontSize: 14,
  fontWeight: 600,
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "var(--line-strong)" },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "var(--brand)" },
  "& .MuiSelect-select": { paddingBlock: "9px" },
};

export default function ContextBar({
  terms,
  termId,
  onTermChange,
  classrooms,
  classroomId,
  onClassroomChange,
  placed,
  total,
}: ContextBarProps): React.ReactNode {
  const complete = total > 0 && placed >= total;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2">
        <span className="text-[13px] font-medium text-muted">ภาคเรียน</span>
        <Select
          value={terms.some((t) => t.id === termId) ? termId : ""}
          onChange={(e) => onTermChange(e.target.value)}
          size="small"
          sx={selectSx}
          displayEmpty
          disabled={terms.length === 0}
        >
          {terms.length === 0 && <MenuItem value="">— ไม่มีภาคเรียน —</MenuItem>}
          {terms.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.label}
            </MenuItem>
          ))}
        </Select>
      </label>
      <label className="flex items-center gap-2">
        <span className="text-[13px] font-medium text-muted">ชั้นเรียน</span>
        <Select
          value={classrooms.some((c) => c.id === classroomId) ? classroomId : ""}
          onChange={(e) => onClassroomChange(e.target.value)}
          size="small"
          sx={selectSx}
          displayEmpty
          disabled={classrooms.length === 0}
        >
          {classrooms.length === 0 && <MenuItem value="">— ไม่มีห้องเรียน —</MenuItem>}
          {classrooms.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.label}
            </MenuItem>
          ))}
        </Select>
      </label>

      <div className="ml-auto flex items-center gap-2">
        <span
          className="tabular inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold"
          style={{
            backgroundColor: complete ? "var(--success-soft)" : "var(--brand-soft)",
            color: complete ? "oklch(0.42 0.1 152)" : "var(--brand-ink)",
          }}
        >
          <Icon name={complete ? "success" : "calendar"} sx={{ fontSize: 16 }} />
          จัดแล้ว {placed}/{total} คาบ
        </span>
      </div>
    </div>
  );
}
