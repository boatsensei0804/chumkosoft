import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ScanFace, Settings2, UsersRound, Wifi } from "lucide-react";
import PageHeader from "@/features/dashboard/components/page-header";
import { Button } from "@/components/ui/button";
import AdmsNetworkForm from "@/features/kiosk/components/adms-network-form";
import { getAdmsNetworks } from "@/features/faces/services/zkteco-networks";
import ScanSettingForm from "@/features/kiosk/components/scan-setting-form";
import KioskManager from "@/features/kiosk/components/kiosk-manager";
import { admsKioskAccount, legacyAdmsDevice, listAdmsDevices } from "@/features/faces/services/zkteco-devices";
import { admsUploadResultSchema } from "@/features/faces/zkteco-upload-result";
import ZktecoRegistry from "@/app/scanner-devices/zkteco/registry";
import prisma from "@/lib/prisma";
import { requireRoles } from "@/lib/dal";
import { getScanSetting, listKioskAccounts } from "@/features/kiosk/services/kiosk-service";

export const metadata: Metadata = {
  title: "จุดสแกนใบหน้า · chumkosoft",
};

export const dynamic = "force-dynamic";

const settingsLinks = [
  { href: "#zkteco-networks", label: "เครือข่ายที่อนุญาต", icon: Wifi },
  { href: "#kiosk-accounts", label: "บัญชีจุดสแกน", icon: UsersRound },
  { href: "/dashboard/faces", label: "ข้อมูลใบหน้านักเรียน", icon: ScanFace },
  { href: "/scanner-devices", label: "ตั้งค่ากล้องของแอปสแกน", icon: Settings2 },
];

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
    lastUpload: device.admsLastUploadAt,
    lastUploadResult: admsUploadResultSchema.safeParse(device.admsLastUploadResult).data ?? null,
    mappingCount: device._count.pinMappings,
  }));

  return (
    <>
      <PageHeader
        pose="scan"
        compact
        title="จุดสแกนใบหน้า"
        subtitle="ตรวจสถานะเครื่องและบันทึกที่ส่งถึงโรงเรียน"
        actions={<Button asChild className="min-h-10">
          <Link href="/dashboard/attendance?mode=school">ดูบันทึกเข้า–ออก <ArrowRight aria-hidden="true" /></Link>
        </Button>}
      />

      <div className="space-y-5">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <ZktecoRegistry devices={rows} kiosks={kiosks} now={clock[0].now.getTime()} />
          <div className="min-w-0 space-y-5">
            <ScanSettingForm setting={setting} />
            <nav aria-labelledby="scanner-settings-links" className="rounded-xl border border-line bg-card">
              <h2 id="scanner-settings-links" className="border-b border-line px-4 py-3 font-bold text-ink-strong">จัดการจุดสแกน</h2>
              <ul className="px-2 py-1.5">
                {settingsLinks.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link href={href} className="group flex min-h-11 items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium hover:bg-brand-soft">
                      <Icon className="size-4 shrink-0 text-brand" aria-hidden="true" />
                      <span className="flex-1">{label}</span>
                      <ArrowRight className="size-4 shrink-0 text-muted group-hover:text-brand" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
        <AdmsNetworkForm key={network.revision} {...network} />
        <div id="kiosk-accounts" tabIndex={-1} className="scroll-mt-24"><KioskManager accounts={accounts} /></div>
      </div>
    </>
  );
}
