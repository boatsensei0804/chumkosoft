"use client";

import { useEffect } from "react";
import Button from "@mui/material/Button";
import BrandMark from "@/features/dashboard/components/brand-mark";
import Icon from "@/features/dashboard/components/icon";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }): React.ReactNode {
  useEffect(() => {
    // Surface the error server-side logs already captured; keep the client console useful too.
    console.error(error);
  }, [error]);

  return (
    <main
      className="grid min-h-dvh place-items-center px-4 py-10"
      style={{ background: "linear-gradient(180deg, var(--surface) 0%, oklch(0.945 0.024 254) 100%)" }}
    >
      <div className="w-full max-w-[440px] text-center">
        <div className="mb-6 flex justify-center">
          <BrandMark />
        </div>

        <section
          className="overflow-hidden rounded-[16px]"
          style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "0 8px 30px oklch(0.45 0.15 254 / 0.08)" }}
        >
          <div className="flex flex-col items-center px-7 pb-7 pt-8">
            <span
              className="grid size-12 place-items-center rounded-full"
              style={{ backgroundColor: "var(--danger-soft)", color: "var(--danger)" }}
              aria-hidden="true"
            >
              <Icon name="warning" sx={{ fontSize: 26 }} />
            </span>
            <h1 className="mt-4 text-[18px] font-bold text-ink-strong">เกิดข้อผิดพลาดบางอย่าง</h1>
            <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-muted">
              ระบบไม่สามารถแสดงหน้านี้ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง หากยังพบปัญหาโปรดติดต่อผู้ดูแลระบบ
            </p>
            <div className="mt-6 flex items-center gap-2">
              <Button variant="contained" onClick={reset} startIcon={<Icon name="arrow_forward" sx={{ fontSize: 18 }} />}>
                ลองใหม่อีกครั้ง
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
