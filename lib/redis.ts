import "server-only";

import Redis from "ioredis";

/**
 * Redis singleton (ioredis). Optional: if REDIS_URL is unset or the connection
 * fails, callers should degrade gracefully rather than error. Uses the same
 * global-caching trick as the Prisma client so dev hot-reload doesn't leak
 * connections.
 */

const globalForRedis = globalThis as unknown as { redis?: Redis | null };

export function getRedis(): Redis | null {
  if (globalForRedis.redis !== undefined) {
    return globalForRedis.redis;
  }

  const url = process.env.REDIS_URL;
  if (!url) {
    globalForRedis.redis = null;
    return null;
  }

  const client = new Redis(url, {
    lazyConnect: false,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
  // Prevent unhandled 'error' events from crashing the process when Redis is down.
  client.on("error", () => undefined);

  globalForRedis.redis = client;
  return client;
}
