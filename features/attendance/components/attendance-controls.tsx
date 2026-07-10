"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { AttendanceOffering } from "@/features/attendance/types";

interface AttendanceControlsProps {
  offerings: AttendanceOffering[];
  selectedOfferingId: string;
  date: string;
}

export default function AttendanceControls({ offerings, selectedOfferingId, date }: AttendanceControlsProps): React.ReactNode {
  const router = useRouter();

  function navigate(offeringId: string, nextDate: string): void {
    const params = new URLSearchParams();
    if (offeringId) params.set("offering", offeringId);
    if (nextDate) params.set("date", nextDate);
    router.push(`/dashboard/attendance?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 shadow-sm sm:flex-row sm:items-end">
      <div className="flex flex-col gap-1.5 sm:max-w-[360px] sm:flex-1">
        <Label htmlFor="attendance-offering">ชั้นเรียน / รายวิชา</Label>
        <NativeSelect id="attendance-offering" value={selectedOfferingId} onChange={(e) => navigate(e.target.value, date)}>
          <option value="">เลือกรายวิชา…</option>
          {offerings.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-1.5 sm:w-[200px]">
        <Label htmlFor="attendance-date">วันที่</Label>
        <Input id="attendance-date" type="date" value={date} onChange={(e) => navigate(selectedOfferingId, e.target.value)} />
      </div>
    </div>
  );
}
