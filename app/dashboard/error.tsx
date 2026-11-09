"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import MascotEmptyState from "@/components/ui/mascot-empty-state";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }): React.ReactNode {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <MascotEmptyState
      title="โหลดหน้านี้ไม่สำเร็จ"
      description="เกิดข้อผิดพลาดขณะดึงข้อมูล กรุณาลองใหม่อีกครั้ง"
      pose="error"
      action={<Button onClick={reset}><RefreshCw className="size-[18px]" /> ลองใหม่อีกครั้ง</Button>}
    />
  );
}
