import type { Metadata } from "next";
import Link from "next/link";
import { ScanFace } from "lucide-react";
import PageHeader from "@/features/dashboard/components/page-header";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
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
          <Button asChild variant="outline">
            <Link href="/scan">
              <ScanFace className="size-[18px]" />
              เปิดหน้าจอสแกน
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-5">
        <ScanSettingForm setting={setting} />
        <KioskManager accounts={accounts} />
      </div>

      <Toaster position="bottom-center" richColors />
    </>
  );
}
