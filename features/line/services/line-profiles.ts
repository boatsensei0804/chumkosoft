import "server-only";

import { createHash } from "node:crypto";
import { getRedis } from "@/lib/redis";

/** LINE display names can change. Cache briefly and keep raw user IDs on the server. */
export async function getLineDisplayNames(userIds: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return names;
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return names;

  const redis = getRedis();
  const key = (id: string) => `line-profile:${createHash("sha256").update(id).digest("hex")}`;
  let cached: (string | null)[] = [];
  try { cached = redis ? await redis.mget(ids.map(key)) : []; } catch { /* still fetch from LINE */ }
  const missing = ids.filter((id, index) => {
    const value = cached[index];
    if (value === undefined || value === null) return true;
    if (value !== "-") names.set(id, value);
    return false;
  });

  for (let start = 0; start < missing.length; start += 8) {
    await Promise.all(missing.slice(start, start + 8).map(async (id) => {
      let displayName: string | null = null;
      try {
        const response = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: AbortSignal.timeout(3000),
        });
        if (response.ok) {
          const profile = await response.json() as { displayName?: unknown };
          if (typeof profile.displayName === "string") displayName = profile.displayName.trim().slice(0, 100) || null;
        }
      } catch { /* profile may be unavailable if the account blocked the OA */ }
      if (displayName) names.set(id, displayName);
      try { await redis?.set(key(id), displayName ?? "-", "EX", displayName ? 86_400 : 3600); } catch { /* cache is optional */ }
    }));
  }
  return names;
}
