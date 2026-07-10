"use client";

import { useEffect } from "react";
import { TriangleAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }): React.ReactNode {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-card px-6 py-16 text-center shadow-sm">
      <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger" aria-hidden="true">
        <TriangleAlert className="size-6" />
      </span>
      <p className="text-[15px] font-semibold text-ink-strong">โหลดหน้านี้ไม่สำเร็จ</p>
      <p className="max-w-sm text-[13.5px] text-muted">เกิดข้อผิดพลาดขณะดึงข้อมูล กรุณาลองใหม่อีกครั้ง</p>
      <Button onClick={reset} className="mt-1">
        <RefreshCw className="size-[18px]" /> ลองใหม่อีกครั้ง
      </Button>
    </div>
  );
}
