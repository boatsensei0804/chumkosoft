import { timingSafeEqual } from "node:crypto";
import { sendAdvisorDigests } from "@/features/line/services/advisor-digest";

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.ADVISOR_LINE_DIGEST_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || !supplied || Buffer.byteLength(secret) !== Buffer.byteLength(supplied) ||
      !timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const result = await sendAdvisorDigests();
    return Response.json(result, { status: result.failed ? 503 : 200 });
  } catch {
    return new Response("Digest unavailable", { status: 503 });
  }
}
