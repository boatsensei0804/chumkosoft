import type { Metadata } from "next";
import Button from "@mui/material/Button";
import BrandMark from "@/features/dashboard/components/brand-mark";
import Icon from "@/features/dashboard/components/icon";
import { logoutAction } from "@/features/auth/actions";
import { getCurrentUser } from "@/lib/dal";
import { ROLE_LABELS } from "@/features/auth/roles";

export const metadata: Metadata = {
  title: "ไม่มีสิทธิ์เข้าถึง — chumkosoft",
};

export default async function UnauthorizedPage(): Promise<React.ReactNode> {
  const user = await getCurrentUser();

  return (
    <main
      className="grid min-h-dvh place-items-center px-4 py-10"
      style={{
        background: "linear-gradient(180deg, var(--surface) 0%, oklch(0.945 0.024 254) 100%)",
      }}
    >
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex justify-center">
          <BrandMark />
        </div>

        <section
          className="overflow-hidden rounded-[16px]"
          style={{ backgroundColor: "var(--bg)", border: "1px solid var(--line)", boxShadow: "0 8px 30px oklch(0.45 0.15 254 / 0.08)" }}
          aria-labelledby="unauthorized-heading"
        >
          <div className="flex flex-col items-center px-7 pb-7 pt-8 text-center">
            <span
              className="grid size-12 place-items-center rounded-full"
              style={{ backgroundColor: "var(--surface-2)", color: "var(--muted)" }}
              aria-hidden="true"
            >
              <Icon name="info" sx={{ fontSize: 26 }} />
            </span>

            <h1 id="unauthorized-heading" className="mt-4 text-[20px] font-bold text-ink-strong">
              ไม่มีสิทธิ์เข้าถึงส่วนนี้
            </h1>
            <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-muted">
              บัญชีของคุณ ({ROLE_LABELS[user.role]}) ยังไม่มีสิทธิ์เข้าใช้งานส่วนบริหารจัดการของสถานศึกษา
              หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบ
            </p>

            <form action={logoutAction} className="mt-6 w-full">
              <Button type="submit" variant="outlined" size="large" fullWidth startIcon={<Icon name="logout" sx={{ fontSize: 18 }} />}>
                ออกจากระบบ
              </Button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
