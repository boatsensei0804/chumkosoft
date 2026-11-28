import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { getRedis } from "@/lib/redis";

export const PAIRING_SECONDS = 300;
export const PAIRING_POLL_SECONDS = 5;
export const USER_CODE_PATTERN = /^[A-F0-9]{12}$/;
export const DEVICE_CODE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function deviceKey(deviceCode: string, purpose: string): string {
  const hash = createHash("sha256").update(deviceCode).digest("hex");
  return `scanner:${purpose}:device:${hash}`;
}

function userKey(userCode: string, purpose: string): string {
  return `scanner:${purpose}:user:${userCode}`;
}

/** Redis is required for QR login; this flow fails closed when it is unavailable. */
export async function startScannerPairing(purpose: "pair" | "display" = "pair"): Promise<{ deviceCode: string; userCode: string } | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    // The shared client disables offline queuing, so its first command must wait
    // for the initial connection to become ready.
    if (redis.status !== "ready") {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => { cleanup(); reject(new Error("Redis timeout")); }, 3000);
        const ready = () => { cleanup(); resolve(); };
        const failed = () => { cleanup(); reject(new Error("Redis unavailable")); };
        const cleanup = () => {
          clearTimeout(timer);
          redis.off("ready", ready);
          redis.off("end", failed);
        };
        redis.once("ready", ready);
        redis.once("end", failed);
        if (redis.status === "ready") ready();
      });
    }
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const deviceCode = randomBytes(32).toString("base64url");
      const userCode = randomBytes(6).toString("hex").toUpperCase();
      const userCreated = await redis.set(userKey(userCode, purpose), deviceKey(deviceCode, purpose), "EX", PAIRING_SECONDS, "NX");
      if (userCreated !== "OK") continue;
      await redis.set(deviceKey(deviceCode, purpose), "pending", "EX", PAIRING_SECONDS);
      return { deviceCode, userCode };
    }
  } catch {
    return null;
  }
  return null;
}

export async function scannerPairingState(userCode: string, purpose: "pair" | "display" = "pair"): Promise<"pending" | "approved" | "expired"> {
  if (!USER_CODE_PATTERN.test(userCode)) return "expired";
  const redis = getRedis();
  if (!redis) return "expired";
  try {
    const key = await redis.get(userKey(userCode, purpose));
    if (!key) return "expired";
    const value = await redis.get(key);
    if (value === "pending") return "pending";
    if (value?.startsWith("approved:")) return "approved";
  } catch {
    return "expired";
  }
  return "expired";
}

export async function approveScannerPairing(userCode: string, kioskId: string, purpose: "pair" | "display" = "pair"): Promise<boolean> {
  if (!USER_CODE_PATTERN.test(userCode)) return false;
  const redis = getRedis();
  if (!redis) return false;
  try {
    const key = await redis.get(userKey(userCode, purpose));
    if (!key || !key.startsWith(`scanner:${purpose}:device:`)) return false;
    const result = await redis.eval(
      "if redis.call('GET', KEYS[1]) ~= 'pending' then return 0 end " +
        "redis.call('SET', KEYS[1], ARGV[1], 'KEEPTTL') return 1",
      1,
      key,
      `approved:${kioskId}`,
    );
    return result === 1;
  } catch {
    return false;
  }
}

/** Atomic one-time claim: pending polls do not consume the code. */
export async function pollScannerPairing(deviceCode: string, purpose: "pair" | "display" = "pair"): Promise<{ state: "pending" | "expired" | "approved"; kioskId?: string }> {
  if (!DEVICE_CODE_PATTERN.test(deviceCode)) return { state: "expired" };
  const redis = getRedis();
  if (!redis) return { state: "expired" };
  try {
    const value = await redis.eval(
      "local value = redis.call('GET', KEYS[1]) " +
        "if not value then return '' end " +
        "if string.sub(value, 1, 9) == 'approved:' then redis.call('DEL', KEYS[1]) end " +
        "return value",
      1,
      deviceKey(deviceCode, purpose),
    );
    if (value === "pending") return { state: "pending" };
    if (typeof value === "string" && value.startsWith("approved:")) {
      return { state: "approved", kioskId: value.slice(9) };
    }
  } catch {
    return { state: "expired" };
  }
  return { state: "expired" };
}
