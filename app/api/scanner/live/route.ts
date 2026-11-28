import { z } from "zod";
import prisma from "@/lib/prisma";
import { decryptSession, getSessionToken } from "@/lib/session";
import { getLiveScan } from "@/features/faces/services/live-scan-service";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request): Promise<Response> {
  const session = await decryptSession(await getSessionToken());
  if (!session) return Response.json({ ok: false }, { status: 401, headers });

  const viewer = await prisma.user.findFirst({
    where: { id: session.userId, isActive: true, isDeleted: false, role: { in: ["ADMIN", "KIOSK"] } },
    select: { id: true, role: true },
  });
  if (!viewer) return Response.json({ ok: false }, { status: 403, headers });

  const device = z.string().uuid().nullable().safeParse(new URL(request.url).searchParams.get("device") || null);
  if (!device.success) return Response.json({ ok: false }, { status: 400, headers });
  return Response.json({ scan: await getLiveScan(viewer, device.data) }, { headers });
}
