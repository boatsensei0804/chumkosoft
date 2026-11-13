import { NextResponse } from "next/server";
import { verifyLineSignature } from "@/lib/line";
import { handleLinkMessage } from "@/features/line/services/line-service";
import { handleLeaveLineMessage } from "@/features/leave/services/line-leave-service";

/**
 * LINE Messaging API webhook — the one REST endpoint in the app, because LINE is
 * an external consumer that must POST here. Verifies the request signature, then
 * routes text messages to leave requests or the account-linking handler.
 * Leave processing failures return 503 so LINE may redeliver the event.
 */

interface LineTextMessageEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { id?: string; type?: string; text?: string };
}

function isTextMessage(event: unknown): event is Required<Pick<LineTextMessageEvent, "replyToken">> & {
  source: { userId: string };
  message: { id: string; text: string };
} {
  if (typeof event !== "object" || event === null) return false;
  const e = event as LineTextMessageEvent;
  return (
    e.type === "message" &&
    e.message?.type === "text" &&
    typeof e.message.text === "string" &&
    typeof e.message.id === "string" &&
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

  let leaveProcessingFailed = false;
  await Promise.all(
    events.map(async (event) => {
      if (isTextMessage(event)) {
        try {
          if (!await handleLeaveLineMessage(event.source.userId, event.message.text, event.replyToken, event.message.id)) {
            await handleLinkMessage(event.source.userId, event.message.text, event.replyToken);
          }
        } catch (error) {
          console.error("[line webhook] message processing failed", error);
          if (/^ลา(?:\s|$)/u.test(event.message.text.trim())) leaveProcessingFailed = true;
        }
      }
    }),
  );

  // LINE can redeliver failed leave events; lineMessageId prevents duplicates.
  return leaveProcessingFailed ? new NextResponse("retry leave event", { status: 503 }) : NextResponse.json({ ok: true });
}
