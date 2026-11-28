"use client";

import { useRouter } from "next/navigation";
import { useActionState, useRef, useState, useTransition } from "react";
import { Activity, ChevronDown, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdmsUploadResult } from "@/features/faces/zkteco-upload-result";
import { idleAction } from "@/types/form";
import { manageAdmsDevice } from "./actions";

type Device = {
  id: string;
  name: string;
  location: string;
  serial: string;
  enabled: boolean;
  kioskUserId: string;
  kioskEmail: string;
  kioskActive: boolean;
  lastSeen: Date | null;
  lastSync: Date | null;
  lastUpload: Date | null;
  lastUploadResult: AdmsUploadResult | null;
};

const format = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });
const timestamp = (date: Date | null) => date ? format.format(date) : "—";

const uploadLabels = {
  synced: "รับบันทึกเข้า–ออกโรงเรียนแล้ว",
  before_mapping: "รายการเก่าจากก่อนเปลี่ยนวิธีตรวจรหัส",
  invalid_body: "ข้อมูลที่เครื่องส่งมาว่างหรืออ่านไม่ได้",
  invalid_row: "รูปแบบบันทึกไม่ถูกต้อง",
  invalid_timestamp: "วันที่หรือเวลาที่เครื่องส่งมาไม่ถูกต้อง",
  ambiguous_pin: "พบรหัสนักเรียนที่ตรงกันมากกว่าหนึ่งรายการ",
  unmapped_pin: "ไม่พบรหัสนักเรียนที่ตรงกับ User ID โปรดตรวจเลขที่ตั้งไว้บนเครื่อง",
  attendance_rule: "ไม่ผ่านเงื่อนไขเช็กชื่อ เช่น ความยินยอม การลงทะเบียน หรือเวลาสแกน",
  unavailable: "ระบบรับบันทึกขัดข้อง",
  status_or_verification: "รายการไม่ได้ระบุเข้า–ออกด้วยใบหน้า",
} satisfies Record<AdmsUploadResult["outcome"], string>;

function status(device: Device, now: number) {
  if (!device.enabled) return { label: "หยุดรับบันทึก", className: "bg-surface text-muted" };
  if (!device.kioskActive) return { label: "บัญชีจุดสแกนไม่พร้อม", className: "bg-amber-50 text-amber-800" };
  if (!device.lastSeen) return { label: "รอเครื่องติดต่อ", className: "bg-surface text-muted" };
  if (now - device.lastSeen.getTime() > 120_000) return { label: "ออฟไลน์", className: "bg-amber-50 text-amber-800" };
  return { label: "ออนไลน์", className: "bg-emerald-50 text-emerald-800" };
}

export default function ZktecoRegistry({ devices, kiosks, now }: { devices: Device[]; kiosks: { id: string; email: string }[]; now: number }) {
  const [state, action, pending] = useActionState(manageAdmsDevice, idleAction);
  const [editingId, setEditingId] = useState<string>();
  const [refreshing, startRefresh] = useTransition();
  const deviceForm = useRef<HTMLDetailsElement>(null);
  const editing = devices.find(({ id }) => id === editingId);
  const router = useRouter();

  function openDeviceForm(id?: string) {
    setEditingId(id);
    if (deviceForm.current) deviceForm.current.open = true;
  }

  return <div id="zkteco" tabIndex={-1} className="min-w-0 scroll-mt-24 space-y-4">
    {state.message && <p role={state.ok ? "status" : "alert"}
      className={`rounded-xl border px-4 py-3 text-sm ${state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>{state.message}</p>}
    <section aria-labelledby="scanner-registry-heading" className="rounded-xl border border-line bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
        <div>
          <h2 id="scanner-registry-heading" className="font-bold text-ink-strong">เครื่องสแกน ZKTeco</h2>
          <p className="mt-0.5 text-xs text-muted">ลงทะเบียนแล้ว {devices.length} เครื่อง</p>
          <p className="mt-1.5 text-sm text-muted">ตั้ง User ID บนเครื่องตามรหัสนักเรียน เช่น 68-0421 ใช้ 680421</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {devices.length > 0 && (
            <Button type="button" variant="outline" className="min-h-10" disabled={refreshing} onClick={() => startRefresh(() => router.refresh())}>
              <RefreshCw aria-hidden="true" className={refreshing ? "motion-safe:animate-spin" : undefined} />
              {refreshing ? "กำลังรีเฟรช…" : "รีเฟรชสถานะ"}
            </Button>
          )}
          <Button asChild className="min-h-10">
            <a href="#device-form" onClick={() => openDeviceForm()}><Plus aria-hidden="true" /> ลงทะเบียนเครื่อง</a>
          </Button>
        </div>
      </header>
      {devices.length ? <ul className="divide-y divide-line">{devices.map((device) => {
        const current = status(device, now);
        const upload = device.lastUploadResult;
        const uploadMessage = upload ? uploadLabels[upload.outcome] : "ได้รับข้อมูลจากเครื่องแล้ว";
        return <li key={device.id} className="space-y-4 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="min-w-0 flex-1 basis-40">
              <h3 className="break-words text-base font-bold text-ink-strong">{device.name}</h3>
              <p className="break-words text-sm text-muted">{device.location || "ยังไม่ระบุจุดติดตั้ง"} · Serial {device.serial}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${current.className}`}>
              <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />{current.label}
            </span>
          </div>
          <dl className="rounded-lg bg-surface px-3.5 py-3 text-sm">
            <dt className="flex items-center gap-2 text-xs font-semibold text-brand-ink">
              <Activity className="size-3.5 shrink-0" aria-hidden="true" /> ผลรับบันทึกล่าสุด
            </dt>
            <dd className="mt-1 font-semibold text-ink-strong">
              {device.lastUpload ? uploadMessage : "ยังไม่พบการส่งบันทึก"}
            </dd>
            {device.lastUpload && (
              <dd className="mt-1 text-xs text-muted">
                <time dateTime={device.lastUpload.toISOString()}>{timestamp(device.lastUpload)}</time>
                {upload?.outcome === "status_or_verification" &&
                  <span> · Status {upload.status ?? "—"}, Verify {upload.verification ?? "—"}</span>}
              </dd>
            )}
          </dl>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-muted">ติดต่อครั้งล่าสุด</dt><dd className="mt-0.5 tabular-nums">{timestamp(device.lastSeen)}</dd></div>
            <div><dt className="text-xs text-muted">ซิงก์บันทึกล่าสุด</dt><dd className="mt-0.5 tabular-nums">{timestamp(device.lastSync)}</dd></div>
          </dl>
          <details className="group">
            <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-semibold text-brand-ink [&::-webkit-details-marker]:hidden">
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" /> บัญชีจุดสแกน
            </summary>
            <dl className="grid gap-2 py-2 text-sm sm:grid-cols-2">
              <div className="min-w-0"><dt className="text-xs text-muted">อีเมลบัญชี</dt><dd className="break-all">{device.kioskEmail}</dd></div>
            </dl>
          </details>
          <div className="flex flex-wrap gap-2 border-t border-line pt-3">
            <Button asChild variant="outline" size="sm" className="min-h-10"><a href="#device-form" onClick={() => openDeviceForm(device.id)}>แก้ไขเครื่อง</a></Button>
            <form action={action}>
              <input type="hidden" name="id" value={device.id} />
              <input type="hidden" name="operation" value={device.enabled ? "disable" : "enable"} />
              <Button type="submit" variant="outline" size="sm" className="min-h-10" disabled={pending}>{device.enabled ? "หยุดรับบันทึก" : "เปิดรับบันทึก"}</Button>
            </form>
          </div>
        </li>;
      })}</ul> : <p className="p-5 text-sm text-muted">ยังไม่มีเครื่อง ZKTeco ที่ลงทะเบียน</p>}
    </section>
    <details id="device-form" ref={deviceForm} open={devices.length === 0 || undefined} className="group scroll-mt-24 rounded-xl border border-line bg-card">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 font-bold text-ink-strong hover:bg-surface sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="break-words">{editing ? `แก้ไข ${editing.name}` : "ฟอร์มลงทะเบียนเครื่อง"}</span>
        <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-line p-4 sm:p-5">
        {kiosks.length ? <form key={editing?.id ?? "new"} action={action} className="space-y-4">
          <input type="hidden" name="operation" value="save" />
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="adms-name">ชื่อเครื่อง</Label>
              <Input id="adms-name" name="name" maxLength={80} defaultValue={editing?.name} placeholder="MB10-VL ประตูหน้า" required />
            </div>
            <div className="space-y-1"><Label htmlFor="adms-location">จุดติดตั้ง</Label>
              <Input id="adms-location" name="location" maxLength={100} defaultValue={editing?.location} placeholder="ประตูโรงเรียน" required />
            </div>
            <div className="space-y-1"><Label htmlFor="adms-serial">เลข Serial</Label>
              <Input id="adms-serial" name="serial" pattern="[A-Za-z0-9\-]{1,64}" maxLength={64} defaultValue={editing?.serial} readOnly={Boolean(editing)} required />
            </div>
            <div className="space-y-1"><Label htmlFor="adms-kiosk">บัญชีจุดสแกน</Label>
              <select id="adms-kiosk" name="kioskUserId" defaultValue={kiosks.some(({ id }) => id === editing?.kioskUserId) ? editing?.kioskUserId : ""}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" required>
                <option value="">เลือกบัญชีจุดสแกน</option>
                {kiosks.map(({ id, email }) => <option value={id} key={id}>{email}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>{pending ? "กำลังบันทึก…" : editing ? "บันทึกการแก้ไข" : "ลงทะเบียนเครื่อง"}</Button>
            {editing && <Button type="button" variant="outline" onClick={() => setEditingId(undefined)}>ยกเลิกแก้ไข</Button>}
          </div>
        </form> : <p className="text-sm text-muted">สร้างหรือเปิดใช้งานบัญชีจุดสแกนก่อนลงทะเบียนเครื่อง <a href="#kiosk-accounts" className="font-semibold text-brand-ink underline">จัดการบัญชีจุดสแกน</a></p>}
      </div>
    </details>
  </div>;
}
