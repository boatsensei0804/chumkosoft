import prisma from "@/lib/prisma";
import { getObjectBytes } from "@/lib/minio";
import { ANNOUNCEMENT_IMAGE_ID } from "@/features/line/announcement-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** LINE's image fetcher cannot sign in. An unguessable UUID exposes only the
 * sanitized image of an existing, non-deleted announcement, never bucket paths. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  if (!ANNOUNCEMENT_IMAGE_ID.test(id)) return new Response(null, { status: 404 });
  const preview = new URL(request.url).searchParams.get("size") === "preview";
  const row = await prisma.lineAnnouncement.findFirst({ where: { imageId: id, isDeleted: false }, select: { imageKey: true, imagePreviewKey: true } });
  const key = preview ? row?.imagePreviewKey : row?.imageKey;
  if (!key) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  try {
    const bytes = await getObjectBytes(key, preview ? 1024 * 1024 : 10 * 1024 * 1024);
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": "image/jpeg", "Content-Length": String(bytes.length),
      "Cache-Control": "private, max-age=60", "X-Content-Type-Options": "nosniff",
      "Content-Disposition": 'inline; filename="announcement.jpg"',
    } });
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } });
  }
}
