import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { getRedis } from "@/lib/redis";

export const QR_LOGIN_SECONDS = 300;
export const QR_LOGIN_CODE_PATTERN = /^[A-F0-9]{16}$/;

function browserKey(browserToken: string): string {
  return `auth:qr:browser:${createHash("sha256").update(browserToken).digest("hex")}`;
}

function codeKey(code: string): string {
  return `auth:qr:code:${code}`;
}

async function readyRedis() {
  const redis = getRedis();
  if (!redis) return null;
  if (redis.status === "ready") return redis;
  try {
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
    return redis;
  } catch {
    return null;
  }
}

/** A random browser secret is kept only in an HttpOnly cookie; the QR contains the public code. */
export async function startQrLogin(): Promise<{ browserToken: string; code: string } | null> {
  const redis = await readyRedis();
  if (!redis) return null;
  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const browserToken = randomBytes(32).toString("base64url");
      const code = randomBytes(8).toString("hex").toUpperCase();
      const key = browserKey(browserToken);
      if (await redis.set(codeKey(code), key, "EX", QR_LOGIN_SECONDS, "NX") !== "OK") continue;
      try {
        await redis.set(key, "pending", "EX", QR_LOGIN_SECONDS);
        return { browserToken, code };
      } catch {
        await redis.del(codeKey(code));
        throw new Error("Redis unavailable");
      }
    }
  } catch {
    return null;
  }
  return null;
}

/** Called only after verifying LINE's webhook signature and matching a linked staff account. */
export async function approveQrLogin(code: string, userId: string, lineUserId: string): Promise<boolean> {
  if (!QR_LOGIN_CODE_PATTERN.test(code) || !/^[A-Za-z0-9_-]+$/.test(userId) || !/^U[0-9a-f]{32}$/.test(lineUserId)) return false;
  const redis = await readyRedis();
  if (!redis) return false;
  try {
    const key = await redis.get(codeKey(code));
    if (!key?.startsWith("auth:qr:browser:")) return false;
    const changed = await redis.eval(
      "if redis.call('GET', KEYS[1]) ~= 'pending' then return 0 end " +
        "redis.call('SET', KEYS[1], ARGV[1], 'KEEPTTL') return 1",
      1, key, `approved:${userId}:${lineUserId}`,
    );
    return changed === 1;
  } catch {
    return false;
  }
}

/** Atomically consumes approval; a different browser cannot claim it without the secret cookie. */
export async function claimQrLogin(browserToken: string): Promise<{ state: "pending" | "approved" | "expired"; userId?: string; lineUserId?: string }> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(browserToken)) return { state: "expired" };
  const redis = await readyRedis();
  if (!redis) return { state: "expired" };
  try {
    const value = await redis.eval(
      "local value = redis.call('GET', KEYS[1]) " +
        "if not value then return '' end " +
        "if string.sub(value, 1, 9) == 'approved:' then redis.call('DEL', KEYS[1]) end " +
        "return value",
      1, browserKey(browserToken),
    );
    if (value === "pending") return { state: "pending" };
    if (typeof value === "string" && value.startsWith("approved:")) {
      const match = /^approved:([A-Za-z0-9_-]+):(U[0-9a-f]{32})$/.exec(value);
      if (match) return { state: "approved", userId: match[1], lineUserId: match[2] };
    }
  } catch {
    return { state: "expired" };
  }
  return { state: "expired" };
}
