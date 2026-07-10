"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
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
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 shadow-sm sm:flex-row sm:items-end">
      <div className="flex flex-col gap-1.5 sm:max-w-[300px] sm:flex-1">
        <Label htmlFor="entry-classroom">ชั้นเรียน</Label>
        <NativeSelect id="entry-classroom" value={classroomId} onChange={(e) => navigate(e.target.value, date)}>
          <option value="">ทุกชั้นเรียน</option>
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} · {c.gradeLevel}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-1.5 sm:w-[200px]">
        <Label htmlFor="entry-date">วันที่</Label>
        <Input id="entry-date" type="date" value={date} onChange={(e) => navigate(classroomId, e.target.value)} />
      </div>
    </div>
  );
}
