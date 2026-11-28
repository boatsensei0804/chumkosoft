import type { Metadata } from "next";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandMark from "@/features/dashboard/components/brand-mark";
import LiveScanDisplay from "@/features/faces/components/live-scan-display";
import { listLiveScanDevices } from "@/features/faces/services/live-scan-service";
import { requireRoles } from "@/lib/dal";

export const metadata: Metadata = { title: "จอแสดงผลการสแกน · Chumkosoft" };

export default async function ScanPage({ searchParams }: { searchParams: Promise<{ device?: string }> }) {
  const viewer = await requireRoles(["ADMIN", "KIOSK"]);
  const [params, devices] = await Promise.all([searchParams, listLiveScanDevices(viewer)]);
  const deviceId = devices.find(({ id }) => id === params.device)?.id ?? null;

  return (
    <div className="flex min-h-dvh flex-col bg-card text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <BrandMark />
          <div className="flex flex-wrap items-center gap-2">
            {devices.length > 1 && (
              <form action="/scan" className="flex items-center gap-2">
                <select aria-label="เลือกเครื่องสแกน" name="device" defaultValue={deviceId ?? ""} className="min-h-10 w-40 rounded-lg border border-line bg-card px-2 text-sm sm:w-52">
                  <option value="">ทุกเครื่องที่เชื่อมไว้</option>
                  {devices.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
                </select>
                <Button type="submit" variant="outline" className="min-h-10">เลือก</Button>
              </form>
            )}
            <Button asChild variant="ghost" className="min-h-10">
              <Link href={viewer.role === "ADMIN" ? "/dashboard/kiosk" : "/scanner-devices"}>
                <Settings2 aria-hidden="true" /> ตั้งค่าเครื่อง
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <LiveScanDisplay key={deviceId ?? "all"} deviceId={deviceId} hasDevices={devices.length > 0} />
    </div>
  );
}
