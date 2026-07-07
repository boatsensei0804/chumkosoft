import "server-only";

import { getRedis } from "@/lib/redis";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
}

/**
 * Fixed-window rate limiter backed by Redis. Fails OPEN: if Redis is unavailable
 * the request is allowed, so an outage never locks users out (availability over
 * strict enforcement for this use case).
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) {
    return { ok: true, remaining: limit };
  }

  try {
    const redisKey = `rl:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }
    return { ok: count <= limit, remaining: Math.max(0, limit - count) };
  } catch {
    return { ok: true, remaining: limit };
  }
}
