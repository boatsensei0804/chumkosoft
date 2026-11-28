import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight, Clock3, Monitor, ScanFace, Settings2, UsersRound, Wifi } from "lucide-react";
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

const scannerSections = [
  { href: "#zkteco", label: "สถานะเครื่อง", icon: ScanFace },
  { href: "#kiosk-scan-times", label: "เวลาเปิดสแกน", icon: Clock3 },
  { href: "#zkteco-networks", label: "เครือข่ายที่อนุญาต", icon: Wifi },
  { href: "#kiosk-accounts", label: "บัญชีจุดสแกน", icon: UsersRound },
];

const appLinks = [
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
  }));

  const now = clock[0].now.getTime();
  const online = rows.filter((device) => device.enabled && device.kioskActive && device.lastSeen && now - device.lastSeen.getTime() <= 120_000);
  const needsReview = rows.filter((device) => !online.includes(device) || (!device.lastSync || (device.lastUploadResult && device.lastUploadResult.outcome !== "synced")));

  return (
    <>
      <PageHeader
        pose="scan"
        title="จุดสแกนใบหน้า"
        subtitle="ตรวจสถานะเครื่องและบันทึกที่ส่งถึงโรงเรียน"
        actions={<>
          <Button asChild className="min-h-11"><Link href="/kiosk/login"><Monitor aria-hidden="true" /> เปิดจอ Kiosk</Link></Button>
          <Button asChild variant="outline"><Link href="/scanner-devices">จัดการเครื่องและหน้าจอ</Link></Button>
          <Button asChild variant="outline" className="min-h-11 text-ink-strong">
            <Link href="/dashboard/attendance?mode=school">ดูบันทึกเข้า–ออก <ArrowRight aria-hidden="true" /></Link>
          </Button>
        </>}
      />

      <section aria-labelledby="scanner-health" className="mb-5 rounded-2xl border border-line bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="scanner-health" className="font-bold text-ink-strong">สถานะเครื่อง ZKTeco</h2>
            <p className="mt-1 text-sm text-muted">ออนไลน์ {online.length} จาก {rows.length} เครื่อง · ต้องตรวจ {needsReview.length} เครื่อง</p>
          </div>
          <Button asChild variant="outline"><Link href="#zkteco">ดูผลรับบันทึกจากเครื่อง</Link></Button>
        </div>
        {needsReview.length > 0 && <ul className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
          {needsReview.map((device) => <li key={device.id}><Link href={`#scanner-${device.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-warning-soft px-3 text-sm font-semibold text-warning hover:underline">
            {device.name} · {!device.enabled ? "หยุดรับบันทึก" : !device.kioskActive ? "บัญชีไม่พร้อม" : !device.lastSeen ? "รอติดต่อ" : !online.includes(device) ? "ออฟไลน์" : !device.lastSync ? "ยังไม่มีผลซิงก์" : "ตรวจผลรับบันทึกล่าสุด"}
          </Link></li>)}
        </ul>}
      </section>

      <nav aria-label="ส่วนต่าง ๆ ในหน้าจุดสแกน" className="mb-5">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {scannerSections.map(({ href, label, icon: Icon }) => (
            <li key={href} className="min-w-0">
              <Link href={href} className="group flex h-full min-h-11 items-center gap-2 rounded-xl border border-line bg-card px-2.5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:px-3">
                <Icon className="size-4 shrink-0 text-brand" aria-hidden="true" />
                <span className="grow">{label}</span>
                <ArrowDown className="hidden size-3.5 shrink-0 text-muted group-hover:text-brand lg:block" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,23rem)]">
        <ZktecoRegistry devices={rows} kiosks={kiosks} now={now} />

        <div className="min-w-0 space-y-5 xl:col-start-2 xl:row-span-2 xl:row-start-1">
          <div id="kiosk-scan-times" tabIndex={-1} className="scroll-mt-24"><ScanSettingForm setting={setting} /></div>
          <AdmsNetworkForm key={network.revision} {...network} />
          <nav aria-labelledby="scanner-app-links" className="rounded-xl border border-line bg-card">
            <h2 id="scanner-app-links" className="border-b border-line px-4 py-3 font-bold text-ink-strong">แอปสแกนใบหน้า</h2>
            <ul className="p-2">
              {appLinks.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link href={href} className="group flex min-h-11 items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand">
                    <Icon className="size-4 shrink-0 text-brand" aria-hidden="true" />
                    <span className="grow">{label}</span>
                    <ArrowRight className="size-4 shrink-0 text-muted group-hover:text-brand" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div id="kiosk-accounts" tabIndex={-1} className="min-w-0 scroll-mt-24"><KioskManager accounts={accounts} /></div>
      </div>
    </>
  );
}
