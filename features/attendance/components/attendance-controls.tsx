"use client";

import { useRouter } from "next/navigation";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import type { AttendanceOffering } from "@/features/attendance/types";

interface AttendanceControlsProps {
  offerings: AttendanceOffering[];
  selectedOfferingId: string;
  date: string;
}

export default function AttendanceControls({
  offerings,
  selectedOfferingId,
  date,
}: AttendanceControlsProps): React.ReactNode {
  const router = useRouter();

  function navigate(offeringId: string, nextDate: string): void {
    const params = new URLSearchParams();
    if (offeringId) params.set("offering", offeringId);
    if (nextDate) params.set("date", nextDate);
    router.push(`/dashboard/attendance?${params.toString()}`);
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-[16px] p-4 sm:flex-row sm:items-end"
      style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}
    >
      <TextField
        label="ชั้นเรียน / รายวิชา"
        select
        value={selectedOfferingId}
        onChange={(e) => navigate(e.target.value, date)}
        fullWidth
        sx={{ maxWidth: { sm: 360 } }}
      >
        <MenuItem value="">
          <span style={{ color: "var(--faint)" }}>เลือกรายวิชา…</span>
        </MenuItem>
        {offerings.map((o) => (
          <MenuItem key={o.id} value={o.id}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        label="วันที่"
        type="date"
        value={date}
        onChange={(e) => navigate(selectedOfferingId, e.target.value)}
        sx={{ maxWidth: { sm: 200 } }}
        slotProps={{ inputLabel: { shrink: true } }}
      />
    </div>
  );
}
