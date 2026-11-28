import Link from "next/link";
import { Button } from "@/components/ui/button";
import PageHeader from "@/features/dashboard/components/page-header";
import PortalHeader from "@/features/portal/components/portal-header";
import StatStrip from "@/components/ui/stat-strip";
import MascotEmptyState from "@/components/ui/mascot-empty-state";
import DeviceSettingsDialog from "@/features/kiosk/components/device-settings-dialog";
import ScannerDevicesAutoRefresh from "./auto-refresh";
import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { requireRoles } from "@/lib/dal";
import { legacyAdmsDevice } from "@/features/faces/services/zkteco-devices";
import { getScanSetting } from "@/features/kiosk/repositories/kiosk-repository";
import { removeScannerDevice, saveScannerDevice, saveScannerTime, setScannerDisplayOverride } from "./actions";

export const metadata: Metadata = { title: "จัดการเครื่องสแกน · chumkosoft" };
export const dynamic = "force-dynamic";

export default async function ScannerDevicesPage() {
  const user = await requireRoles(["ADMIN", "KIOSK"]);
  const legacyAdmsId = legacyAdmsDevice()?.id;
  const [devices, scanTime, clock] = await Promise.all([
    prisma.scannerDevice.findMany({
      where: { removedAt: null, ...(user.role === "KIOSK" && { kioskUserId: user.id }) },
      include: { kioskUser: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getScanSetting(),
    prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() AS now`,
  ]);
  const now = clock[0].now.getTime();
  const isOnline = (device: typeof devices[number]) => {
    const seen = device.admsLastSeenAt ?? device.lastSeenAt;
    return Boolean(seen && now - seen.getTime() < 90_000);
  };
  const field = "mt-1 w-full rounded-xl border border-sky-200 bg-white px-3 py-3 text-slate-900 focus:border-sky-600 focus:outline-none";
  return (
    <div className="min-h-dvh bg-sky-50 text-slate-900"><PortalHeader user={user} /><ScannerDevicesAutoRefresh /><main className="px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader pose="scan" title="จัดการอุปกรณ์สแกน" subtitle="ดูสถานะและตั้งค่าเครื่องสแกนของโรงเรียน" actions={<>
          <Button asChild><Link href="/kiosk/login">เข้าสู่จอ Kiosk</Link></Button>
          {user.role === "ADMIN" && <>
            <Button asChild variant="outline"><Link href="/dashboard/kiosk">จัดการบัญชีจุดสแกน</Link></Button>
            <Button asChild variant="outline"><Link href="/dashboard/kiosk#zkteco">จัดการเครื่อง ZKTeco</Link></Button>
          </>}
        </>} />
        <StatStrip items={[
          { label: "เครื่องทั้งหมด", value: devices.length, hint: "เครื่อง", tone: "brand" },
          { label: "ออนไลน์", value: devices.filter(isOnline).length, hint: "เครื่อง", tone: "success" },
          { label: "รอซิงค์จากสถานะล่าสุด", value: devices.reduce((sum, device) => sum + device.pendingCount, 0), hint: "รายการ", tone: "warning" },
        ]} />
        <div className="space-y-5">
          {devices.length === 0 && (
            <MascotEmptyState pose="scan" title="ยังไม่มีเครื่องที่เชื่อมต่อ" description="ลงทะเบียนเครื่อง ZKTeco ในหน้าจัดการจุดสแกน หรือเชื่อมโปรแกรมสแกนผ่าน QR" />
          )}
          {devices.map((device) => {
            const online = isOnline(device);
            const adms = Boolean(device.admsSerial || device.id === legacyAdmsId);
            const lastSeen = device.admsLastSeenAt ?? device.lastSeenAt;
            const lastSync = device.admsLastSyncAt ?? device.lastSyncAt;
            return (
              <section key={device.id} className="rounded-[22px] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h2 className="wrap-anywhere text-xl font-bold">{device.name}</h2><p className="wrap-anywhere text-xs text-slate-600">{device.kioskUser.email} · {device.admsSerial ?? device.id.slice(0, 8)}</p></div>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${online ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                    {online ? "ออนไลน์" : "ออฟไลน์"}
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
                  {!adms && <p className="rounded-xl bg-sky-50 p-3"><span className="block text-slate-500">กล้อง</span><strong>{online ? (device.cameraActive ? "ทำงาน" : "หยุด") : "ไม่มีสถานะล่าสุด"}</strong></p>}
                  {!adms && <p className="rounded-xl bg-sky-50 p-3"><span className="block text-slate-500">หน้าจอ</span><strong>{online ? (device.screenActive === null ? "ยังไม่รายงาน" : device.screenActive ? "เปิดอยู่" : "พักจอ") : "ไม่ทราบ · เครื่องออฟไลน์"}</strong></p>}
                  {!adms && <p className="rounded-xl bg-sky-50 p-3"><span className="block text-slate-500">{online ? "รอส่ง" : "รอส่งตามรายงานล่าสุด"}</span><strong>{device.pendingCount} รายการ</strong></p>}
                  <p className="rounded-xl bg-sky-50 p-3"><span className="block text-slate-500">โมเดล</span><strong>{adms ? "ZKTeco" : device.modelVersion ?? "—"}</strong></p>
                  <p className="rounded-xl bg-sky-50 p-3"><span className="block text-slate-500">พบล่าสุด</span><strong>{lastSeen ? lastSeen.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }) : "ยังไม่พบ"}</strong></p>
                </div>
                <p className="mt-3 text-sm text-slate-600">ซิงก์ล่าสุด {lastSync ? lastSync.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }) : "ยังไม่เคยซิงก์"}</p>
                <DeviceSettingsDialog title={`แก้ไข ${device.name}`} action={saveScannerDevice}>
                  <input type="hidden" name="id" value={device.id} />
                  <label className="text-sm font-semibold">ชื่อเครื่อง<input name="name" defaultValue={device.name} required maxLength={80} className={field} /></label>
                  <div hidden={adms} className="contents" style={adms ? { display: "none" } : undefined}><label className="text-sm font-semibold">กล้อง<select name="cameraIndex" defaultValue={device.cameraIndex} className={field}>{Array.from({ length: 10 }, (_, i) => <option key={i} value={i}>กล้อง {i}</option>)}</select></label>
                  <label className="text-sm font-semibold">ตรวจใบหน้าทุก<select name="detectionIntervalSeconds" defaultValue={device.detectionIntervalSeconds} className={field}>{[0.5, 0.85, 1.5].map((v) => <option key={v} value={v}>{v} วินาที</option>)}</select></label>
                  <label className="text-sm font-semibold">พักก่อนตรวจคนเดิมซ้ำ<select name="repeatCooldownSeconds" defaultValue={device.repeatCooldownSeconds} className={field}>{[10, 30, 60].map((v) => <option key={v} value={v}>{v} วินาที</option>)}</select></label>
                  </div>
                  {([["showStudentName", "แสดงชื่อ–นามสกุล"], ["showScanTime", "แสดงเวลาสแกน"], ["showScanHistory", "แสดงรายการก่อนหน้า"]] as const).map(([key, label]) => <label key={key}><input type="checkbox" name={key} defaultChecked={device[key]} /> {label}</label>)}
                  <label className="text-sm font-semibold">ตารางพักหน้าจอ<select name="displayScheduleEnabled" defaultValue={String(device.displayScheduleEnabled)} className={field}><option value="true">เปิดใช้</option><option value="false">ปิดใช้</option></select></label>
                  <label className="text-sm font-semibold">เวลาเปิดหน้าจอ<input type="time" name="displayOnTime" defaultValue={device.displayOnTime} required className={field} /></label>
                  <label className="text-sm font-semibold">เวลาพักหน้าจอ<input type="time" name="displayOffTime" defaultValue={device.displayOffTime} required className={field} /></label>

                </DeviceSettingsDialog>
                {user.role === "ADMIN" && <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-danger">ลบเครื่อง</summary>
                  <form action={removeScannerDevice} className="mt-2 flex flex-wrap items-center gap-3"><input type="hidden" name="id" value={device.id} />
                    <label><input type="checkbox" name="confirm" required /> ยืนยันนำเครื่องนี้ออกและหยุดรับข้อมูล โดยเก็บประวัติเดิม</label>
                    <Button variant="outline">ยืนยันลบเครื่อง</Button></form></details>}
                <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50 p-4">
                  <p className="font-semibold">ควบคุมหน้าจอ · โหมดปัจจุบัน: {device.displayOverride === "AUTO" ? "ตามตาราง" : device.displayOverride === "ON" ? "เปิดค้าง" : "พักจอค้าง"}</p>
                  <p className="mt-1 text-xs text-slate-600">จอ Kiosk ที่เลือกเครื่องนี้จะรับคำสั่งเมื่อออนไลน์ ระหว่างพักจอยังบันทึกการสแกนได้</p>
                  <form action={setScannerDisplayOverride} className="mt-3 flex flex-wrap gap-2">
                    <input type="hidden" name="deviceId" value={device.id} />
                    <button name="mode" value="AUTO" className="rounded-lg border border-sky-200 min-h-11 bg-white px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand">ตามตาราง</button>
                    <button name="mode" value="ON" className="rounded-lg border border-sky-200 min-h-11 bg-white px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand">เปิดจอ</button>
                    <button name="mode" value="OFF" className="rounded-lg border border-sky-200 min-h-11 bg-white px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand">พักจอ</button>
                  </form>
                </div>
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
