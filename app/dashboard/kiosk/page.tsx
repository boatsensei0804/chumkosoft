import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/features/dashboard/components/page-header";
import Icon from "@/features/dashboard/components/icon";
import ScanSettingForm from "@/features/kiosk/components/scan-setting-form";
import KioskManager from "@/features/kiosk/components/kiosk-manager";
import { requireRoles } from "@/lib/dal";
import { getScanSetting, listKioskAccounts } from "@/features/kiosk/services/kiosk-service";

export const metadata: Metadata = {
  title: "จุดสแกนใบหน้า · chumkosoft",
};

export const dynamic = "force-dynamic";

export default async function KioskPage(): Promise<React.ReactNode> {
  await requireRoles(["ADMIN"]);
  const [setting, accounts] = await Promise.all([getScanSetting(), listKioskAccounts()]);

  return (
    <>
      <PageHeader
        title="จุดสแกนใบหน้า"
        subtitle="ตั้งค่าเวลาการสแกนเข้าโรงเรียน และจัดการบัญชีสำหรับหน้าจอสแกน"
        actions={
          <Link
            href="/scan"
            className="inline-flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-[14px] font-semibold"
            style={{ border: "1px solid var(--line-strong)", color: "var(--ink)" }}
          >
            <Icon name="scan" sx={{ fontSize: 18 }} />
            เปิดหน้าจอสแกน
          </Link>
        }
      />

      <div className="flex flex-col gap-5">
        <ScanSettingForm setting={setting} />
        <KioskManager accounts={accounts} />
      </div>
    </>
  );
}
