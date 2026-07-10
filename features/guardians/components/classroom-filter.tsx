"use client";

import { NativeSelect } from "@/components/ui/native-select";
import type { GuardianClassroomOption } from "@/features/guardians/services/guardian-service";

interface ClassroomFilterProps {
  classrooms: GuardianClassroomOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

/** Active-year classroom filter for the guardian / LINE pages. */
export default function ClassroomFilter({ classrooms, value, onChange, disabled }: ClassroomFilterProps): React.ReactNode {
  return (
    <label className="flex items-center gap-2">
      <span className="shrink-0 text-[13px] font-medium text-muted">ห้องเรียน</span>
      <NativeSelect
        value={classrooms.some((c) => c.id === value) ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label="กรองตามห้องเรียน"
        className="min-w-36 bg-card font-semibold"
      >
        <option value="">ทุกห้อง</option>
        {classrooms.map((c) => (
          <option key={c.id} value={c.id}>
            {c.code}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}
