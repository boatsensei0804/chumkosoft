import Link from "next/link";
import { Button } from "@/components/ui/button";
import PageHeader from "@/features/dashboard/components/page-header";
import PortalHeader from "@/features/portal/components/portal-header";
import SemanticStatusBadge from "@/components/ui/semantic-status-badge";
import { admsUploadResultSchema } from "@/features/faces/zkteco-upload-result";
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
      include: { kioskUser: { select: { email: true, role: true, isActive: true, isDeleted: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getScanSetting(),
    prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() AS now`,
  ]);
  const now = clock[0].now.getTime();
  const formatter = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });
  const rows = devices.map((device) => {
    const adms = Boolean(device.admsSerial || device.id === legacyAdmsId);
    const lastSeen = adms ? device.admsLastSeenAt : device.lastSeenAt;
    const lastSync = adms ? device.admsLastSyncAt : device.lastSyncAt;
    const upload = admsUploadResultSchema.safeParse(device.admsLastUploadResult).data;
    const accountReady = device.kioskUser.role === "KIOSK" && device.kioskUser.isActive && !device.kioskUser.isDeleted;
    const online = Boolean(lastSeen && now - lastSeen.getTime() <= (adms ? 120_000 : 90_000));
    const connection = adms && !device.admsEnabled ? "หยุดรับบันทึก" : !accountReady ? "บัญชีไม่พร้อม" : !lastSeen ? "รอติดต่อ" : online ? "ออนไลน์" : "ออฟไลน์";
    const needsReview = connection !== "ออนไลน์" || (adms && (!lastSync || Boolean(upload && upload.outcome !== "synced"))) || (!adms && (device.pendingCount > 0 || !device.cameraActive));
    return { device, adms, lastSeen, lastSync, upload, connection, needsReview };
  });
  const groups = [
    { id: "scanner-review", title: "เครื่องที่ต้องตรวจ", rows: rows.filter((row) => row.needsReview) },
    { id: "scanner-ready", title: "เครื่องพร้อมใช้งาน", rows: rows.filter((row) => !row.needsReview) },
  ];
  const field = "mt-1 w-full rounded-xl border border-line bg-white px-3 py-3 text-ink focus:border-brand focus:outline-none";
  return (
    <div className="min-h-dvh bg-surface text-ink"><PortalHeader user={user} /><ScannerDevicesAutoRefresh /><main className="px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader pose="scan" title="จัดการอุปกรณ์สแกน" subtitle="ดูสถานะและตั้งค่าเครื่องสแกนของโรงเรียน" actions={<>
          <Button asChild><Link href="/kiosk/login">เข้าสู่จอ Kiosk</Link></Button>
          {user.role === "ADMIN" && <>
            <Button asChild variant="outline"><Link href="/dashboard/kiosk">จัดการบัญชีจุดสแกน</Link></Button>
            <Button asChild variant="outline"><Link href="/dashboard/kiosk#zkteco">จัดการเครื่อง ZKTeco</Link></Button>
          </>}
        </>} />
        <nav aria-label="สรุปสถานะอุปกรณ์" className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-card px-4 py-3">
          <strong className="text-sm">ออนไลน์ {rows.filter((row) => row.connection === "ออนไลน์").length} จาก {rows.length} เครื่อง</strong>
          {groups.filter((group) => group.rows.length > 0).map((group) => <Link key={group.id} href={`#${group.id}`} className="inline-flex min-h-11 items-center rounded-lg bg-brand-soft px-3 text-sm font-semibold text-brand-ink hover:underline">{group.title} {group.rows.length} เครื่อง</Link>)}
        </nav>
        <div className="space-y-5">
          {devices.length === 0 && (
            <MascotEmptyState pose="scan" title="ยังไม่มีเครื่องที่เชื่อมต่อ" description="ลงทะเบียนเครื่อง ZKTeco ในหน้าจัดการจุดสแกน หรือเชื่อมโปรแกรมสแกนผ่าน QR" />
          )}
          {groups.filter((group) => group.rows.length > 0).map((group) => (
            <section key={group.id} id={group.id} aria-labelledby={`${group.id}-title`} tabIndex={-1} className="scroll-mt-6 overflow-hidden rounded-2xl border border-line bg-card">
              <h2 id={`${group.id}-title`} className="border-b border-line bg-surface px-4 py-3 font-bold text-ink-strong">{group.title} <span className="text-sm font-normal text-muted">· {group.rows.length} เครื่อง</span></h2>
              <ul className="divide-y divide-line">
          {group.rows.map(({ device, adms, lastSeen, lastSync, upload, connection }) => {
            const displayMode = device.displayOverride === "ON" ? "เปิดค้าง" : device.displayOverride === "OFF" ? "พักจอค้าง" : device.displayScheduleEnabled ? `${device.displayOnTime}–${device.displayOffTime} น.` : "ตามตาราง · ยังไม่เปิดตาราง";
            return (
              <li key={device.id} className="px-4 py-4 sm:px-5">
                <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))]">
                  <div className="min-w-0"><h3 className="wrap-anywhere font-bold text-ink-strong">{device.name}</h3><p className="wrap-anywhere text-xs text-muted">{adms ? "ZKTeco" : "แอปสแกน"} · {device.admsSerial ?? device.modelVersion ?? device.id.slice(0, 8)}</p></div>
                  <div><p className="mb-1 text-xs text-muted">การติดต่อเครื่อง</p><SemanticStatusBadge tone={connection === "ออนไลน์" ? "success" : "warning"}>{connection}</SemanticStatusBadge>
                    <p className="mt-1 text-xs text-muted">{lastSeen ? formatter.format(lastSeen) : "ยังไม่พบการติดต่อ"}</p>
                  </div>
                  <div><p className="mb-1 text-xs text-muted">ผลบันทึก</p>
                    <p className="text-sm font-semibold">{adms && upload && upload.outcome !== "synced" ? "รายการล่าสุดต้องตรวจ" : lastSync ? "มีบันทึกที่ซิงก์แล้ว" : "ยังไม่มีผลซิงก์"}</p>
                    {lastSync && <p className="text-xs text-muted">ซิงก์ล่าสุด {formatter.format(lastSync)}</p>}
                    <p className="text-xs text-muted">{adms ? "เครื่องไม่ได้รายงานจำนวนคิว" : !lastSeen ? "ยังไม่มีรายงานคิว" : `รอส่งตามรายงานล่าสุด ${device.pendingCount} รายการ`}</p>
                    {adms && user.role === "ADMIN" && upload && upload.outcome !== "synced" && <Link href={`/dashboard/kiosk#scanner-${device.id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-ink underline">ตรวจสาเหตุจากเครื่อง</Link>}
                  </div>
                  <div><p className="mb-1 text-xs text-muted">โหมดจอ Kiosk</p><p className="text-sm font-semibold">{displayMode}</p></div>
                </div>
                <details className="mt-3 rounded-xl border border-line bg-surface/60">
                  <summary className="min-h-11 cursor-pointer px-3 py-2.5 text-sm font-semibold text-brand-ink">การตั้งค่าและควบคุมจอ</summary>
                  <div className="border-t border-line px-3 pb-3">
                    <p className="mt-3 wrap-anywhere text-sm text-muted">บัญชีจุดสแกน {device.kioskUser.email}{!adms && connection === "ออนไลน์" ? ` · กล้อง${device.cameraActive ? "ทำงาน" : "หยุด"} · ${device.screenActive === null ? "ยังไม่รายงานสถานะจอ" : device.screenActive ? "จอเปิดอยู่" : "จอพักอยู่"}` : ""}</p>
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
                <div className="mt-4 rounded-xl border border-line bg-surface p-4">
                  <p className="font-semibold">ควบคุมหน้าจอ · โหมดปัจจุบัน: {device.displayOverride === "AUTO" ? "ตามตาราง" : device.displayOverride === "ON" ? "เปิดค้าง" : "พักจอค้าง"}</p>
                  <p className="mt-1 text-xs text-muted">จอ Kiosk ที่เลือกเครื่องนี้จะรับคำสั่งเมื่อออนไลน์ ระหว่างพักจอยังบันทึกการสแกนได้</p>
                  <form action={setScannerDisplayOverride} className="mt-3 flex flex-wrap gap-2">
                    <input type="hidden" name="deviceId" value={device.id} />
                    <button name="mode" value="AUTO" className="rounded-lg border border-line min-h-11 bg-white px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand">ตามตาราง</button>
                    <button name="mode" value="ON" className="rounded-lg border border-line min-h-11 bg-white px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand">เปิดจอ</button>
                    <button name="mode" value="OFF" className="rounded-lg border border-line min-h-11 bg-white px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand">พักจอ</button>
                  </form>
                </div>
                  </div>
                </details>
              </li>
            );
          })}
              </ul>
            </section>
          ))}
          <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold">เวลาสแกนของโรงเรียน</h2>
            <p className="mt-1 text-sm text-muted">ใช้เวลาไทยกับทุกเครื่อง และใช้ตัดสินว่าสแกนสายหรือไม่</p>
            <p className="mt-3 text-sm font-semibold text-ink">เริ่ม {scanTime.scanStartTime} น. · สายตั้งแต่ {scanTime.lateAfterTime} น.</p>
            {user.role === "ADMIN" && (
              <DeviceSettingsDialog title="เวลาสแกนของโรงเรียน" action={saveScannerTime}>
                <label className="text-sm font-semibold">เริ่มสแกน<input type="time" name="scanStartTime" defaultValue={scanTime.scanStartTime} required className={field} /></label>
                <label className="text-sm font-semibold">หลังเวลานี้ถือว่าสาย<input type="time" name="lateAfterTime" defaultValue={scanTime.lateAfterTime} required className={field} /></label>

              </DeviceSettingsDialog>
            )}
          </section>
        </div>
      </div>
    </main></div>
  );
}
