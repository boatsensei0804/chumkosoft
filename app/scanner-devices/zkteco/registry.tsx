"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  mappingCount: number;
};

const format = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });
const timestamp = (date: Date | null) => date ? format.format(date) : "—";

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
  const editing = devices.find(({ id }) => id === editingId);
  const router = useRouter();

  return <div className="space-y-5">
    {state.message && <p role={state.ok ? "status" : "alert"}
      className={`rounded-xl border px-4 py-3 text-sm ${state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>{state.message}</p>}
    <section id="device-form" className="rounded-xl border border-line bg-card p-5">
      <h2 className="mb-4 font-bold text-ink-strong">{editing ? `แก้ไข ${editing.name}` : "ลงทะเบียนเครื่อง"}</h2>
      {kiosks.length ? <form key={editing?.id ?? "new"} action={action} className="space-y-4">
        <input type="hidden" name="operation" value="save" />
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
      </form> : <p className="text-sm text-muted">สร้างหรือเปิดใช้งานบัญชีจุดสแกนก่อนลงทะเบียนเครื่อง <Link href="/dashboard/kiosk" className="font-semibold text-brand-ink underline">จัดการบัญชีจุดสแกน</Link></p>}
    </section>
    <section className="rounded-xl border border-line bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-5">
        <h2 className="font-bold text-ink-strong">เครื่องที่ลงทะเบียน <span className="ml-2 text-sm font-medium text-muted">{devices.length} เครื่อง</span></h2>
        <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}>รีเฟรชสถานะ</Button>
      </header>
      {devices.length ? <ul className="divide-y divide-line">{devices.map((device) => {
        const current = status(device, now);
        return <li key={device.id} className="space-y-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-ink-strong">{device.name}</h3>
              <p className="break-words text-sm text-muted">{device.location || "ยังไม่ระบุจุดติดตั้ง"} · Serial {device.serial}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${current.className}`}>{current.label}</span>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0"><dt className="text-muted">บัญชีจุดสแกน</dt><dd className="break-words">{device.kioskEmail}</dd></div>
            <div><dt className="text-muted">ติดต่อครั้งล่าสุด</dt><dd>{timestamp(device.lastSeen)}</dd></div>
            <div><dt className="text-muted">ซิงก์บันทึกล่าสุด</dt><dd>{timestamp(device.lastSync)}</dd></div>
            <div><dt className="text-muted">นักเรียนที่ผูกบนเว็บ</dt><dd>{device.mappingCount} คู่รหัส</dd></div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm"><Link href={`/scanner-devices/pin-mappings?device=${device.id}`}>จับคู่รหัสนักเรียน</Link></Button>
            <Button asChild variant="outline" size="sm"><a href="#device-form" onClick={() => setEditingId(device.id)}>แก้ไขเครื่อง</a></Button>
            <form action={action}>
              <input type="hidden" name="id" value={device.id} />
              <input type="hidden" name="operation" value={device.enabled ? "disable" : "enable"} />
              <Button type="submit" variant="outline" size="sm" disabled={pending}>{device.enabled ? "หยุดรับบันทึก" : "เปิดรับบันทึก"}</Button>
            </form>
          </div>
        </li>;
      })}</ul> : <p className="p-5 text-sm text-muted">ยังไม่มีเครื่อง ZKTeco ที่ลงทะเบียน</p>}
    </section>
  </div>;
}
