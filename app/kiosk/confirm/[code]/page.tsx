import { notFound } from "next/navigation";
import { approvePairingAction } from "@/app/pair-scanner/[code]/actions";
import { scannerPairingState, USER_CODE_PATTERN } from "@/features/faces/services/scanner-pairing";
import { getActiveKioskId } from "@/features/faces/services/scanner-api-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function ConfirmDisplay({ params, searchParams }: {
  params: Promise<{code: string}>; searchParams: Promise<{connected?: string; error?: string}>;
}) {
  const { code } = await params;
  if (!USER_CODE_PATTERN.test(code)) notFound();
  const [query, state, account] = await Promise.all([searchParams, scannerPairingState(code, "display"), getActiveKioskId()]);
  return <main className="grid min-h-dvh place-items-center bg-surface p-5"><section className="w-full min-w-0 max-w-md space-y-4 rounded-2xl border border-line bg-card p-6">
    <h1 className="text-2xl font-bold">ยืนยันเปิดจอ Kiosk</h1>
    {query.connected === "1" ? <p role="status">ยืนยันแล้ว กลับไปดูผลบนจอ Kiosk ได้เลย</p> : state !== "pending" ? <p>QR หมดอายุหรือถูกใช้แล้ว กลับไปที่จอ Kiosk กด “สร้าง QR ใหม่” แล้วสแกนอีกครั้ง</p> :
      <form action={approvePairingAction} className="grid gap-4">
        <p>ตรวจว่ารหัสตรงกับจอที่ต้องการเปิดแสดงข้อมูลนักเรียน</p><strong className="rounded-xl bg-brand-soft px-4 py-4 text-center wrap-anywhere font-mono text-xl tracking-wider sm:text-2xl text-brand-ink">{code}</strong>
        <input type="hidden" name="purpose" value="display" /><input type="hidden" name="code" value={code} />
        {!account && <><label>บัญชีจุดสแกน<Input required name="identifier" autoComplete="username" /></label>
          <label>รหัสผ่าน<Input required name="password" type="password" autoComplete="current-password" /></label></>}
        {query.error && <p role="alert">{query.error === "limited" ? "กรุณารอสักครู่แล้วลองอีกครั้ง" : "ยืนยันไม่สำเร็จ กรุณาตรวจบัญชีจุดสแกนและรหัสผ่าน"}</p>}
        <Button className="min-h-11" type="submit">ยืนยันเปิดจอนี้</Button>
      </form>}
  </section></main>;
}
