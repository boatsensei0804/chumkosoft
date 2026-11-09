import QRCode from "qrcode";
import { rateLimit } from "@/lib/rate-limit";
import { PAIRING_POLL_SECONDS, PAIRING_SECONDS, startScannerPairing } from "@/features/faces/services/scanner-pairing";

function allowedSite(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const production = url.origin === "https://chumkosoft.com";
    const local = url.protocol === "http:" &&
      (url.hostname === "127.0.0.1" || url.hostname === "localhost") && Boolean(url.port);
    if (!production && !local) return null;
    if (url.pathname !== "/" || url.search || url.hash || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function matchesRequestOrigin(siteUrl: string, requestUrl: string): boolean {
  const site = new URL(siteUrl);
  const request = new URL(requestUrl);
  const localHosts = ["localhost", "127.0.0.1"];
  if (!localHosts.includes(request.hostname)) {
    // Behind Cloudflare, Next may see the tunnel's internal HTTP origin.
    return site.origin === "https://chumkosoft.com";
  }
  return site.protocol === "http:" && request.protocol === "http:" && site.port === request.port &&
    localHosts.includes(site.hostname);
}

export async function POST(request: Request): Promise<Response> {
  const size = Number(request.headers.get("content-length"));
  if (!Number.isFinite(size) || size < 1 || size > 512) {
    return Response.json({ ok: false, message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const siteUrl = allowedSite((body as { siteUrl?: unknown } | null)?.siteUrl);
  if (!siteUrl || !matchesRequestOrigin(siteUrl, request.url)) {
    return Response.json({ ok: false, message: "URL เว็บไซต์ไม่ถูกต้อง" }, { status: 400 });
  }

  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip") ?? "unknown";
  const limited = await rateLimit(`scanner-pair-start:${ip}`, 5, 60);
  if (!limited.ok) {
    return Response.json({ ok: false, message: "สร้าง QR บ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
  }
  const pairing = await startScannerPairing();
  if (!pairing) {
    return Response.json({ ok: false, message: "ระบบเชื่อม QR ยังไม่พร้อม กรุณาตรวจ Redis" }, { status: 503 });
  }
  const verificationUrl = `${siteUrl}/pair-scanner/${pairing.userCode}`;
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    width: 300, margin: 2, errorCorrectionLevel: "M",
  });
  return Response.json(
    { ok: true, deviceCode: pairing.deviceCode, userCode: pairing.userCode,
      verificationUrl, qrDataUrl, expiresIn: PAIRING_SECONDS, pollInterval: PAIRING_POLL_SECONDS },
    { headers: { "Cache-Control": "no-store" } },
  );
}
