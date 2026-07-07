"use client";

import { useRouter } from "next/navigation";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import type { ClassroomOption } from "@/features/attendance/types";

interface SchoolEntryControlsProps {
  classrooms: ClassroomOption[];
  classroomId: string;
  date: string;
}

export default function SchoolEntryControls({ classrooms, classroomId, date }: SchoolEntryControlsProps): React.ReactNode {
  const router = useRouter();

  function navigate(nextClassroom: string, nextDate: string): void {
    const params = new URLSearchParams({ mode: "school" });
    if (nextClassroom) params.set("classroom", nextClassroom);
    if (nextDate) params.set("date", nextDate);
    router.push(`/dashboard/attendance?${params.toString()}`);
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-[16px] p-4 sm:flex-row sm:items-end"
      style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}
    >
      <TextField
        label="ชั้นเรียน"
        select
        value={classroomId}
        onChange={(e) => navigate(e.target.value, date)}
        fullWidth
        sx={{ maxWidth: { sm: 300 } }}
      >
        <MenuItem value="">ทุกชั้นเรียน</MenuItem>
        {classrooms.map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {c.code} · {c.gradeLevel}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        label="วันที่"
        type="date"
        value={date}
        onChange={(e) => navigate(classroomId, e.target.value)}
        sx={{ maxWidth: { sm: 200 } }}
        slotProps={{ inputLabel: { shrink: true } }}
      />
    </div>
  );
}
