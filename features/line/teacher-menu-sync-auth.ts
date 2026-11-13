import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_AGE_SECONDS = 300;

export function teacherMenuSyncSignature(token: string, timestamp: number): string {
  return createHmac("sha256", token).update(`${timestamp}.teacher-menu-sync`).digest("hex");
}

export function verifyTeacherMenuSync(token: string | undefined, timestamp: string | null, signature: string | null, now = Date.now()): boolean {
  if (!token || !timestamp || !signature || !/^\d{10}$/.test(timestamp) || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const seconds = Number(timestamp);
  if (Math.abs(Math.floor(now / 1000) - seconds) > MAX_AGE_SECONDS) return false;
  const expected = Buffer.from(teacherMenuSyncSignature(token, seconds), "hex");
  const actual = Buffer.from(signature, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
