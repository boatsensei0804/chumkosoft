"use client";

import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import type { GuardianClassroomOption } from "@/features/guardians/services/guardian-service";

interface ClassroomFilterProps {
  classrooms: GuardianClassroomOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

const selectSx = {
  minWidth: 150,
  backgroundColor: "var(--bg)",
  borderRadius: "10px",
  fontSize: 14,
  fontWeight: 600,
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "var(--line)" },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "var(--brand)" },
  "& .MuiSelect-select": { paddingBlock: "9px" },
};

/** Active-year classroom filter for the guardian / LINE pages. */
export default function ClassroomFilter({ classrooms, value, onChange, disabled }: ClassroomFilterProps): React.ReactNode {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[13px] font-medium text-muted">ห้องเรียน</span>
      <Select
        value={classrooms.some((c) => c.id === value) ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        size="small"
        sx={selectSx}
        displayEmpty
        disabled={disabled}
      >
        <MenuItem value="">ทุกห้อง</MenuItem>
        {classrooms.map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {c.code}
          </MenuItem>
        ))}
      </Select>
    </label>
  );
}
