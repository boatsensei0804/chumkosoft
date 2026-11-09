import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandMark from "@/features/dashboard/components/brand-mark";
import { logoutAction } from "@/features/auth/actions";
import { getCurrentUser } from "@/lib/dal";
import { ROLE_LABELS } from "@/features/auth/roles";
import Mascot from "@/components/ui/mascot";

export const metadata: Metadata = {
  title: "ไม่มีสิทธิ์เข้าถึง — chumkosoft",
};

export default async function UnauthorizedPage(): Promise<React.ReactNode> {
  const user = await getCurrentUser();

  return (
    <main className="grid min-h-dvh place-items-center bg-[linear-gradient(180deg,var(--surface)_0%,oklch(0.945_0.024_254)_100%)] px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex justify-center">
          <BrandMark />
        </div>

        <section className="overflow-hidden rounded-2xl border border-line bg-card shadow-[0_8px_30px_oklch(0.45_0.15_254_/_0.08)]" aria-labelledby="unauthorized-heading">
          <div className="flex flex-col items-center px-7 pb-7 pt-8 text-center">
            <Mascot pose="access" size={128} decorative />

            <h1 id="unauthorized-heading" className="mt-4 text-[20px] font-bold text-ink-strong">
              ไม่มีสิทธิ์เข้าถึงส่วนนี้
            </h1>
            <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-muted">
              บัญชีของคุณ ({ROLE_LABELS[user.role]}) ยังไม่มีสิทธิ์เข้าใช้งานส่วนบริหารจัดการของสถานศึกษา
              หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบ
            </p>

            <form action={logoutAction} className="mt-6 w-full">
              <Button type="submit" variant="outline" size="lg" className="w-full">
                <LogOut className="size-[18px]" /> ออกจากระบบ
              </Button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
