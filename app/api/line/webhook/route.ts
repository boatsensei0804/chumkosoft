import { NextResponse } from "next/server";
import { verifyLineSignature } from "@/lib/line";
import { handleLinkMessage } from "@/features/line/services/line-service";

/**
 * LINE Messaging API webhook — the one REST endpoint in the app, because LINE is
 * an external consumer that must POST here. Verifies the request signature, then
 * routes text messages to the account-linking handler. Always returns 200 on
 * valid signatures so LINE does not retry on our internal errors.
 */

interface LineTextMessageEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type?: string; text?: string };
}

function isTextMessage(event: unknown): event is Required<Pick<LineTextMessageEvent, "replyToken">> & {
  source: { userId: string };
  message: { text: string };
} {
  if (typeof event !== "object" || event === null) return false;
  const e = event as LineTextMessageEvent;
  return (
    e.type === "message" &&
    e.message?.type === "text" &&
    typeof e.message.text === "string" &&
    typeof e.source?.userId === "string" &&
    typeof e.replyToken === "string"
  );
}

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();

  if (!verifyLineSignature(rawBody, request.headers.get("x-line-signature"))) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: true });
  }

  const events =
    typeof payload === "object" && payload !== null && Array.isArray((payload as { events?: unknown }).events)
      ? (payload as { events: unknown[] }).events
      : [];

  await Promise.all(
    events.map(async (event) => {
      if (isTextMessage(event)) {
        try {
          await handleLinkMessage(event.source.userId, event.message.text, event.replyToken);
        } catch {
          // Never let one event fail the whole webhook.
        }
      }
    }),
  );

  return NextResponse.json({ ok: true });
}
