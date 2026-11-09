import type { Metadata } from "next";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import BrandMark from "@/features/dashboard/components/brand-mark";
import Mascot from "@/components/ui/mascot";

export const metadata: Metadata = {
  title: "ไม่พบหน้าที่ต้องการ — chumkosoft",
};

export default function NotFound(): React.ReactNode {
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
            <Mascot pose="empty" size={128} decorative />
            <p className="mt-2 text-[32px] font-bold tracking-tight text-ink-strong">404</p>
            <h1 className="text-[18px] font-bold text-ink-strong">ไม่พบหน้าที่ต้องการ</h1>
            <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-muted">
              หน้าที่คุณพยายามเข้าถึงอาจถูกย้าย ลบออก หรือไม่เคยมีอยู่
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-[14px] font-semibold"
              style={{ backgroundColor: "var(--primary)", color: "var(--on-primary)" }}
            >
              <LayoutDashboard className="size-[18px]" />
              กลับสู่หน้าหลัก
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
