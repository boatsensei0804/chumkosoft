"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandMark from "@/features/dashboard/components/brand-mark";
import Mascot from "@/components/ui/mascot";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }): React.ReactNode {
  useEffect(() => {
    // Surface the error server-side logs already captured; keep the client console useful too.
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center bg-[linear-gradient(180deg,var(--surface)_0%,oklch(0.945_0.024_254)_100%)] px-4 py-10">
      <div className="w-full max-w-[440px] text-center">
        <div className="mb-6 flex justify-center">
          <BrandMark />
        </div>

        <section className="overflow-hidden rounded-2xl border border-line bg-card shadow-[0_8px_30px_oklch(0.45_0.15_254_/_0.08)]">
          <div className="flex flex-col items-center px-7 pb-7 pt-8">
            <Mascot pose="error" size={128} decorative />
            <h1 className="mt-4 text-[18px] font-bold text-ink-strong">เกิดข้อผิดพลาดบางอย่าง</h1>
            <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-muted">
              ระบบไม่สามารถแสดงหน้านี้ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง หากยังพบปัญหาโปรดติดต่อผู้ดูแลระบบ
            </p>
            <div className="mt-6 flex items-center gap-2">
              <Button onClick={reset}>
                <RefreshCw className="size-[18px]" /> ลองใหม่อีกครั้ง
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
