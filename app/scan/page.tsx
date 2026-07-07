import type { Metadata } from "next";
import Icon from "@/features/dashboard/components/icon";
import PortalHeader from "@/features/portal/components/portal-header";
import ScanStation from "@/features/faces/components/scan-station";
import KioskClock from "@/features/faces/components/kiosk-clock";
import { requireRoles } from "@/lib/dal";
import { getFaceEnrollmentStats } from "@/features/faces/services/face-service";
import { getScanSetting } from "@/features/kiosk/services/kiosk-service";

export const metadata: Metadata = {
  title: "จุดสแกนใบหน้า — chumkosoft",
};

export const dynamic = "force-dynamic";

export default async function ScanPage(): Promise<React.ReactNode> {
  // The scan station runs under its own KIOSK account; ADMIN may open it to inspect.
  const user = await requireRoles(["KIOSK", "ADMIN"]);
  const [stats, setting] = await Promise.all([getFaceEnrollmentStats(), getScanSetting()]);

  return (
    <div
      className="min-h-dvh"
      style={{ background: "linear-gradient(180deg, var(--surface) 0%, oklch(0.945 0.024 254) 100%)" }}
    >
      <PortalHeader user={user} />

      <main className="mx-auto flex max-w-[720px] flex-col gap-5 px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center gap-3">
          <KioskClock />
          <h1 className="text-[22px] font-bold tracking-tight text-ink-strong sm:text-[26px]">จุดสแกนใบหน้าเช็คชื่อเข้าโรงเรียน</h1>
          <p className="tabular text-[13px] text-muted">
            <Icon name="face" sx={{ fontSize: 15, verticalAlign: "-2px", marginRight: "4px" }} />
            มีข้อมูลใบหน้าแล้ว {stats.enrolledStudents.toLocaleString("th-TH")} / {stats.totalStudents.toLocaleString("th-TH")} คน
          </p>
        </div>

        <ScanStation scanStartTime={setting.scanStartTime} lateAfterTime={setting.lateAfterTime} />

        <div
          className="flex items-start gap-2.5 rounded-[12px] px-4 py-3"
          style={{ backgroundColor: "var(--brand-softer)", border: "1px solid var(--brand-soft)" }}
        >
          <Icon name="info" sx={{ fontSize: 18, color: "var(--brand-ink)", marginTop: "1px" }} />
          <p className="text-[13px] leading-relaxed text-ink">
            ระบบจะจดจำเฉพาะนักเรียนที่ได้รับความยินยอมจากผู้ปกครองและมีรูปใบหน้าในระบบแล้ว เมื่อจดจำได้จะบันทึกเวลาเข้าโรงเรียนอัตโนมัติ
            และแจ้งเตือนผู้ปกครองผ่าน LINE (หากผูกบัญชีไว้)
          </p>
        </div>
      </main>
    </div>
  );
}
