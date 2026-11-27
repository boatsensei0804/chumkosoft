import Link from "next/link";
import { Button } from "@/components/ui/button";
import PageHeader from "@/features/dashboard/components/page-header";
import { admsKioskAccount, legacyAdmsDevice, listAdmsDevices } from "@/features/faces/services/zkteco-devices";
import PortalHeader from "@/features/portal/components/portal-header";
import { requireRoles } from "@/lib/dal";
import prisma from "@/lib/prisma";
import ZktecoRegistry from "./registry";

export const metadata = { title: "เครื่องสแกน ZKTeco · Chumkosoft" };

export default async function ZktecoDevicesPage() {
  const user = await requireRoles(["ADMIN"]);
  const [devices, kiosks, clock] = await Promise.all([
    listAdmsDevices(),
    prisma.user.findMany({ where: admsKioskAccount, select: { id: true, email: true }, orderBy: { email: "asc" } }),
    prisma.$queryRaw<{ now: Date }[]>`SELECT NOW() AS now`,
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

  return <div className="min-h-dvh bg-surface text-ink">
    <PortalHeader user={user} />
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
      <PageHeader title="เครื่องสแกน ZKTeco" subtitle="ลงทะเบียนเครื่องตามจุดติดตั้ง ดูสถานะ และจับคู่รหัสนักเรียน"
        actions={<Button asChild variant="outline"><Link href="/scanner-devices">เครื่องสแกนทั้งหมด</Link></Button>} />
      <ZktecoRegistry devices={rows} kiosks={kiosks} now={clock[0].now.getTime()} />
    </main>
  </div>;
}
