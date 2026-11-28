import Mascot from "@/components/ui/mascot";
import BrandScene from "@/components/ui/brand-scene";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { approvePairingAction } from "./actions";
import { USER_CODE_PATTERN, scannerPairingState } from "@/features/faces/services/scanner-pairing";
import { getActiveKioskId } from "@/features/faces/services/scanner-api-auth";

export const metadata: Metadata = { title: "เชื่อมเครื่องสแกน · chumkosoft" };
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ connected?: string; error?: string }>;
}

export default async function PairScannerPage({ params, searchParams }: PageProps): Promise<React.ReactNode> {
  const { code } = await params;
  if (!USER_CODE_PATTERN.test(code)) notFound();
  const query = await searchParams;
  const state = await scannerPairingState(code);
  const kioskId = await getActiveKioskId();
  const connected = query.connected === "1";
  const error = query.error;

  return (
    <main className="grid min-h-dvh place-items-center bg-linear-to-br from-school-panel-tint to-school-panel-wash px-4 py-6 text-ink-strong">
      <section className="grid w-full min-w-0 max-w-5xl overflow-hidden rounded-[28px] school-card lg:grid-cols-[0.85fr_1fr]">
        <div className="relative hidden min-h-[620px] overflow-hidden bg-[#dff0ff] lg:block">
          <BrandScene pose="scan" />
          <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/70 bg-white/85 p-4 backdrop-blur-sm"><p className="font-bold text-brand-ink">เชื่อมเครื่องสแกนอย่างปลอดภัย</p><p className="mt-1 text-sm text-muted">ตรวจรหัสบนเครื่องก่อนยืนยันทุกครั้ง</p></div>
        </div>
        <div className="min-w-0 p-5 sm:p-8 lg:self-center lg:p-10">
        <Mascot pose={connected ? "success" : state === "pending" ? "scan" : "error"} size={110} decorative className="mx-auto mb-4" />
        <p className="text-sm font-bold text-sky-700">Chumkosoft · จุดสแกนใบหน้า</p>
        <h1 className="mt-3 text-2xl font-bold">เชื่อมโปรแกรมสแกน</h1>
        <p className="mt-2 text-sm text-slate-600">ตรวจว่ารหัสนี้ตรงกับที่แสดงบนโปรแกรมในเครื่อง แล้วจึงกดยืนยัน</p>
        <div className="mt-5 rounded-xl bg-sky-50 px-4 py-5 text-center wrap-anywhere font-mono text-xl font-bold tracking-wider sm:text-2xl text-sky-900">
          {code}
        </div>

        {connected ? (
          <p role="status" className="mt-5 rounded-lg bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            ยืนยันแล้ว กลับไปที่โปรแกรมสแกนเพื่อดูสถานะการเชื่อมต่อ
          </p>
        ) : state !== "pending" ? (
          <p role="alert" className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
            QR นี้หมดอายุหรือถูกใช้งานแล้ว กรุณาสร้าง QR ใหม่จากโปรแกรมสแกน
          </p>
        ) : (
          <>
            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
                {error === "limited" ? "ลองเข้าสู่ระบบใหม่อีกสักครู่" :
                  error === "expired" ? "QR หมดอายุแล้ว กรุณาสร้างใหม่" : "บัญชีจุดสแกนหรือรหัสผ่านไม่ถูกต้อง"}
              </p>
            )}
            <form action={approvePairingAction} className="mt-5 space-y-4">
              <input type="hidden" name="code" value={code} />
              {!kioskId && (
                <>
                  <p className="text-sm text-slate-600">เข้าสู่ระบบด้วยบัญชีจุดสแกนเพื่อยืนยันเครื่องนี้</p>
                  <label className="block text-sm font-medium">
                    บัญชีจุดสแกน
                    <input name="identifier" autoComplete="username" required maxLength={120}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                  </label>
                  <label className="block text-sm font-medium">
                    รหัสผ่าน
                    <input name="password" type="password" autoComplete="current-password" required
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                  </label>
                </>
              )}
              <button type="submit" className="min-h-11 w-full rounded-lg bg-brand px-4 py-3 font-semibold text-white hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                ยืนยันการเชื่อมเครื่องสแกน
              </button>
            </form>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              ยืนยันเฉพาะ QR บนเครื่องสแกนที่คุณกำลังใช้อยู่เท่านั้น QR หมดอายุภายใน 5 นาที
            </p>
          </>
        )}
        {connected && <a href="/scanner-devices" className="mt-4 block rounded-lg bg-sky-700 px-4 py-3 text-center font-semibold text-white">ดูสถานะและตั้งค่าเครื่องสแกน</a>}
        </div>
      </section>
    </main>
  );
}
