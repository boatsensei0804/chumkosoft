import type { Metadata } from "next";
import { ScanFace, Info } from "lucide-react";
import PortalHeader from "@/features/portal/components/portal-header";
import ScanStation from "@/features/faces/components/scan-station";
import KioskClock from "@/features/faces/components/kiosk-clock";
import { requireRoles } from "@/lib/dal";
import { getFaceEnrollmentStats } from "@/features/faces/services/face-service";
import { getTodayFaceCheckIns } from "@/features/faces/services/scan-service";
import { getScanSetting } from "@/features/kiosk/services/kiosk-service";

export const metadata: Metadata = {
  title: "จุดสแกนใบหน้า — chumkosoft",
};

export const dynamic = "force-dynamic";

export default async function ScanPage(): Promise<React.ReactNode> {
  // The scan station runs under its own KIOSK account; ADMIN may open it to inspect.
  const user = await requireRoles(["KIOSK", "ADMIN"]);
  const [stats, setting, checkIns] = await Promise.all([getFaceEnrollmentStats(), getScanSetting(), getTodayFaceCheckIns()]);

  return (
    <div
      className="min-h-dvh"
      style={{ background: "var(--surface)" }}
    >
      <PortalHeader user={user} />

      <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 lg:py-10">
        <div className="flex flex-col items-center gap-3">
          <KioskClock />
          <h1 className="text-[22px] font-bold tracking-tight text-ink-strong sm:text-[26px]">จุดสแกนใบหน้าเช็คชื่อเข้าโรงเรียน</h1>
          <p className="tabular inline-flex items-center gap-1 text-[13px] text-muted">
            <ScanFace className="size-[15px]" />
            มีข้อมูลใบหน้าแล้ว {stats.enrolledStudents.toLocaleString("th-TH")} / {stats.totalStudents.toLocaleString("th-TH")} คน
          </p>
        </div>

        <ScanStation scanStartTime={setting.scanStartTime} lateAfterTime={setting.lateAfterTime} initialCheckIns={checkIns} />

        <div className="flex items-start gap-2.5 rounded-[12px] border border-brand-soft bg-brand-softer px-4 py-3">
          <Info className="mt-px size-[18px] shrink-0 text-brand-ink" />
          <p className="text-[13px] leading-relaxed text-ink">
            ระบบจะจดจำเฉพาะนักเรียนที่ได้รับความยินยอมจากผู้ปกครองและมีรูปใบหน้าในระบบแล้ว เมื่อจดจำได้จะบันทึกเวลาเข้าโรงเรียนอัตโนมัติ
            และแจ้งเตือนผู้ปกครองผ่าน LINE (หากผูกบัญชีไว้)
          </p>
        </div>
      </main>
    </div>
  );
}
