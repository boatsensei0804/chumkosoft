import type { Metadata } from "next";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import PageHeader from "@/features/dashboard/components/page-header";
import { Button } from "@/components/ui/button";
import AdmsNetworkForm from "@/features/kiosk/components/adms-network-form";
import { getAdmsNetworks } from "@/features/faces/services/zkteco-networks";
import ScanSettingForm from "@/features/kiosk/components/scan-setting-form";
import KioskManager from "@/features/kiosk/components/kiosk-manager";
import { admsKioskAccount, legacyAdmsDevice, listAdmsDevices } from "@/features/faces/services/zkteco-devices";
import ZktecoRegistry from "@/app/scanner-devices/zkteco/registry";
import prisma from "@/lib/prisma";
import { requireRoles } from "@/lib/dal";
import { getScanSetting, listKioskAccounts } from "@/features/kiosk/services/kiosk-service";

export const metadata: Metadata = {
  title: "จุดสแกนใบหน้า · chumkosoft",
};

export const dynamic = "force-dynamic";

export default async function KioskPage(): Promise<React.ReactNode> {
  await requireRoles(["ADMIN"]);
  const [devices, kiosks, clock, setting, accounts, network] = await Promise.all([
    listAdmsDevices(),
    prisma.user.findMany({ where: admsKioskAccount, select: { id: true, email: true }, orderBy: { email: "asc" } }),
    prisma.$queryRaw<{ now: Date }[]>`SELECT NOW() AS now`,
    getScanSetting(),
    listKioskAccounts(),
    getAdmsNetworks(),
  ]);
  const legacy = legacyAdmsDevice();
  const rows = devices.map(({ kioskUser, ...device }) => ({
    id: device.id,
    name: device.name,
    location: device.admsLocation ?? "",
    serial: device.admsSerial ?? legacy?.serial ?? "",
    enabled: device.admsEnabled,
    kioskUserId: kioskUser.id,
    kioskEmail: kioskUser.email,
    kioskActive: kioskUser.role === "KIOSK" && kioskUser.isActive && !kioskUser.isDeleted,
    lastSeen: device.admsLastSeenAt,
    lastSync: device.admsLastSyncAt,
    mappingCount: device._count.pinMappings,
  }));

  return (
    <>
      <PageHeader
        title="จุดสแกนใบหน้า"
        subtitle="ดูสถานะเครื่องสแกน ตั้งเวลาเข้าโรงเรียน และจัดการบัญชีจุดสแกน"
        actions={<>
          <Button asChild variant="outline"><a href="#zkteco-networks">เครือข่ายที่อนุญาต</a></Button>
          <Button asChild variant="outline">
            <Link href="/scanner-devices">
              <Settings2 className="size-[18px]" />
              ตั้งค่ากล้องของแอปสแกน
            </Link>
          </Button>
        </>}
      />

      <div className="flex flex-col gap-5">
        <ZktecoRegistry devices={rows} kiosks={kiosks} now={clock[0].now.getTime()} />
        <AdmsNetworkForm key={network.revision} {...network} />
        <ScanSettingForm setting={setting} />
        <div id="kiosk-accounts" tabIndex={-1} className="scroll-mt-24">
          <KioskManager accounts={accounts} />
        </div>
      </div>
    </>
  );
}
