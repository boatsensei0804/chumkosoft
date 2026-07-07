"use client";

import { useEffect } from "react";
import Button from "@mui/material/Button";
import Icon from "@/features/dashboard/components/icon";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }): React.ReactNode {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="flex flex-col items-center gap-3 rounded-[16px] px-6 py-16 text-center"
      style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}
    >
      <span
        className="grid size-12 place-items-center rounded-full"
        style={{ backgroundColor: "var(--danger-soft)", color: "var(--danger)" }}
        aria-hidden="true"
      >
        <Icon name="warning" sx={{ fontSize: 24 }} />
      </span>
      <p className="text-[15px] font-semibold text-ink-strong">โหลดหน้านี้ไม่สำเร็จ</p>
      <p className="max-w-sm text-[13.5px] text-muted">เกิดข้อผิดพลาดขณะดึงข้อมูล กรุณาลองใหม่อีกครั้ง</p>
      <Button variant="contained" onClick={reset} sx={{ mt: 1 }} startIcon={<Icon name="arrow_forward" sx={{ fontSize: 18 }} />}>
        ลองใหม่อีกครั้ง
      </Button>
    </div>
  );
}
