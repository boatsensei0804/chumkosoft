import Link from "next/link";
import PageHeader from "@/features/dashboard/components/page-header";
import PortalHeader from "@/features/portal/components/portal-header";
import StatStrip from "@/components/ui/stat-strip";
import Mascot from "@/components/ui/mascot";
import DeviceSettingsDialog from "@/features/kiosk/components/device-settings-dialog";
import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { requireRoles } from "@/lib/dal";
import { getScanSetting } from "@/features/kiosk/repositories/kiosk-repository";
import { saveScannerDevice, saveScannerTime } from "./actions";

export const metadata: Metadata = { title: "จัดการเครื่องสแกน · chumkosoft" };
export const dynamic = "force-dynamic";

export default async function ScannerDevicesPage() {
  const user = await requireRoles(["ADMIN", "KIOSK"]);
  const [devices, scanTime, clock] = await Promise.all([
    prisma.scannerDevice.findMany({
      where: user.role === "KIOSK" ? { kioskUserId: user.id } : {},
      include: { kioskUser: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getScanSetting(),
    prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() AS now`,
  ]);
  const now = clock[0].now.getTime();
  const field = "mt-1 w-full rounded-xl border border-sky-200 bg-white px-3 py-3 text-slate-900 focus:border-sky-600 focus:outline-none";
  return (
    <div className="min-h-dvh bg-sky-50 text-slate-900"><PortalHeader user={user} /><main className="px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <PageHeader title="จัดการอุปกรณ์สแกน" subtitle="เว็บสำหรับดูสถานะและตั้งค่าเครื่อง ส่วนการสแกนเช็คชื่อทำผ่านแอปที่ติดตั้งในเครื่อง" actions={user.role === "ADMIN" ? <Link href="/dashboard/kiosk" className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-brand-ink">จัดการบัญชีจุดสแกน</Link> : undefined} />
        <StatStrip items={[
          { label: "เครื่องทั้งหมด", value: devices.length, hint: "เครื่อง", tone: "brand" },
          { label: "ออนไลน์", value: devices.filter((device) => device.lastSeenAt && now - device.lastSeenAt.getTime() < 90_000).length, hint: "เครื่อง", tone: "success" },
          { label: "รอซิงค์จากสถานะล่าสุด", value: devices.reduce((sum, device) => sum + device.pendingCount, 0), hint: "รายการ", tone: "warning" },
        ]} />
        <div className="space-y-5">
          {devices.length === 0 && (
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <Mascot pose="scan" size={100} decorative /><h2 className="text-lg font-bold">ยังไม่มีเครื่องที่เชื่อมต่อ</h2>
              <p className="mt-2 text-sm text-slate-600">เปิดโปรแกรมสแกน แล้วสแกน QR เพื่อผูกกับบัญชีจุดสแกนนี้</p>
            </section>
          )}
          {devices.map((device) => {
            const online = device.lastSeenAt && now - device.lastSeenAt.getTime() < 90_000;
            return (
              <section key={device.id} className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h2 className="text-xl font-bold">{device.name}</h2><p className="text-xs text-slate-500">{device.kioskUser.email} · {device.id.slice(0, 8)}</p></div>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${online ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                    {online ? "ออนไลน์" : "ออฟไลน์"}
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <p className="rounded-xl bg-sky-50 p-3"><span className="block text-slate-500">กล้อง</span><strong>{device.cameraActive ? "ทำงาน" : "หยุด"}</strong></p>
                  <p className="rounded-xl bg-sky-50 p-3"><span className="block text-slate-500">รอส่ง</span><strong>{device.pendingCount} รายการ</strong></p>
                  <p className="rounded-xl bg-sky-50 p-3"><span className="block text-slate-500">โมเดล</span><strong>{device.modelVersion ?? "—"}</strong></p>
                  <p className="rounded-xl bg-sky-50 p-3"><span className="block text-slate-500">พบล่าสุด</span><strong>{device.lastSeenAt ? device.lastSeenAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }) : "ยังไม่พบ"}</strong></p>
                </div>
                <DeviceSettingsDialog title={device.name} action={saveScannerDevice}>
                  <input type="hidden" name="id" value={device.id} />
                  <label className="text-sm font-semibold">ชื่อเครื่อง<input name="name" defaultValue={device.name} required maxLength={80} className={field} /></label>
                  <label className="text-sm font-semibold">กล้อง<select name="cameraIndex" defaultValue={device.cameraIndex} className={field}>{Array.from({ length: 10 }, (_, i) => <option key={i} value={i}>กล้อง {i}</option>)}</select></label>
                  <label className="text-sm font-semibold">ตรวจใบหน้าทุก<select name="detectionIntervalSeconds" defaultValue={device.detectionIntervalSeconds} className={field}>{[0.5, 0.85, 1.5].map((v) => <option key={v} value={v}>{v} วินาที</option>)}</select></label>
                  <label className="text-sm font-semibold">พักก่อนตรวจคนเดิมซ้ำ<select name="repeatCooldownSeconds" defaultValue={device.repeatCooldownSeconds} className={field}>{[10, 30, 60].map((v) => <option key={v} value={v}>{v} วินาที</option>)}</select></label>

                </DeviceSettingsDialog>
              </section>
            );
          })}
          <section className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold">เวลาสแกนของโรงเรียน</h2>
            <p className="mt-1 text-sm text-slate-600">ใช้เวลาไทยกับทุกเครื่อง และใช้ตัดสินว่าสแกนสายหรือไม่</p>
            {user.role === "ADMIN" ? (
              <DeviceSettingsDialog title="เวลาสแกนของโรงเรียน" action={saveScannerTime}>
                <label className="text-sm font-semibold">เริ่มสแกน<input type="time" name="scanStartTime" defaultValue={scanTime.scanStartTime} required className={field} /></label>
                <label className="text-sm font-semibold">หลังเวลานี้ถือว่าสาย<input type="time" name="lateAfterTime" defaultValue={scanTime.lateAfterTime} required className={field} /></label>

              </DeviceSettingsDialog>
            ) : <p className="mt-4 text-sm">เริ่ม {scanTime.scanStartTime} น. · สายตั้งแต่ {scanTime.lateAfterTime} น. · ให้ผู้ดูแลระบบแก้ไขเวลา</p>}
          </section>
        </div>
      </div>
    </main></div>
  );
}
