import Link from "next/link";
import { Button } from "@/components/ui/button";
import PageHeader from "@/features/dashboard/components/page-header";
import { getPinMappingDevice, legacyScannerPinMap } from "@/features/faces/services/zkteco-pin-mapping";
import PortalHeader from "@/features/portal/components/portal-header";
import { requireRoles } from "@/lib/dal";
import PinMappingForms from "./pin-mapping-forms";

export const metadata = { title: "จับคู่รหัสนักเรียน · Chumkosoft" };

export default async function PinMappingsPage({ searchParams }: { searchParams: Promise<{ device?: string }> }) {
  const user = await requireRoles(["ADMIN"]);
  const device = await getPinMappingDevice((await searchParams).device);
  const mappedPins = new Set(device?.pinMappings.map(({ pin }) => pin));
  const rows = (device?.pinMappings ?? []).flatMap(({ pin, student }) => student ? [{
    pin, studentCode: student.studentCode, studentName: `${student.firstName} ${student.lastName}`,
    archived: student.isDeleted, legacy: false,
  }] : []);
  if (device) {
    for (const [pin, studentCode] of Object.entries(legacyScannerPinMap(device.id))) {
      if (!mappedPins.has(pin)) rows.push({ pin, studentCode, studentName: "", archived: false, legacy: true });
    }
  }

  return <div className="min-h-dvh bg-surface text-ink">
    <PortalHeader user={user} />
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8">
      <PageHeader title="จับคู่รหัสเครื่องสแกน" subtitle={device?.name ?? "ZKTeco MB10-VL"}
        actions={<Button asChild variant="outline"><Link href="/dashboard/kiosk#zkteco">กลับไปเครื่องสแกน ZKTeco</Link></Button>} />
      {device
        ? <PinMappingForms deviceId={device.id} rows={rows.sort((a, b) => a.pin.localeCompare(b.pin))} />
        : <p className="rounded-xl border border-line bg-card p-5">ยังไม่พบเครื่อง ZKTeco ที่พร้อมใช้งาน ให้ผู้ดูแลเซิร์ฟเวอร์ตรวจการเชื่อมต่อของเครื่องก่อนค่ะ</p>}
    </main>
  </div>;
}
