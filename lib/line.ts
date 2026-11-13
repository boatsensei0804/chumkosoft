import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * LINE Messaging API client. Every function degrades gracefully when the channel
 * is not configured (no access token) so the app runs fine without LINE set up —
 * pushes simply no-op and the webhook rejects. Set LINE_CHANNEL_ACCESS_TOKEN and
 * LINE_CHANNEL_SECRET to enable.
 */

const PUSH_URL = "https://api.line.me/v2/bot/message/push";
const REPLY_URL = "https://api.line.me/v2/bot/message/reply";
const MULTICAST_URL = "https://api.line.me/v2/bot/message/multicast";

export function isLineConfigured(): boolean {
  return Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN);
}

/** LINE accepts up to 500 IDs per multicast request. A stable retry key keeps
 * a retried request from sending the same announcement twice. */
export async function sendLineTextToUsers(to: string[], text: string, retryKey: string): Promise<{ accepted: boolean; code: string }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return { accepted: false, code: "NOT_CONFIGURED" };
  if (to.length < 1 || to.length > 500) return { accepted: false, code: "INVALID_RECIPIENT_COUNT" };
  try {
    const response = await fetch(to.length === 1 ? PUSH_URL : MULTICAST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Line-Retry-Key": retryKey,
      },
      body: JSON.stringify({ ...(to.length === 1 ? { to: to[0] } : { to }), messages: [{ type: "text", text }] }),
      signal: AbortSignal.timeout(15_000),
    });
    // LINE returns 409 when this retry key was already accepted.
    return { accepted: response.ok || response.status === 409, code: `HTTP_${response.status}` };
  } catch {
    return { accepted: false, code: "NETWORK_ERROR" };
  }
}

export async function pushText(to: string, text: string): Promise<boolean> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
      signal: AbortSignal.timeout(15_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function replyText(replyToken: string, text: string): Promise<boolean> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(REPLY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ replyToken, messages: [{ type: "text", text }] }),
      signal: AbortSignal.timeout(15_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Verifies the X-Line-Signature header (HMAC-SHA256 of the raw body, base64). */
export function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
