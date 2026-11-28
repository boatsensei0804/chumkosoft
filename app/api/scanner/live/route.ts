import { z } from "zod";
import { getLiveScan, getDisplayViewer } from "@/features/faces/services/live-scan-service";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request): Promise<Response> {
  const viewer = await getDisplayViewer();
  if (!viewer) return Response.json({ ok: false }, { status: 403, headers });

  const device = z.string().uuid().nullable().safeParse(new URL(request.url).searchParams.get("device") || null);
  if (!device.success) return Response.json({ ok: false }, { status: 400, headers });
  return Response.json(await getLiveScan(viewer, device.data), { headers });
}
