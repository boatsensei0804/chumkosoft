import "server-only";

import prisma from "@/lib/prisma";
import { decryptSession, getSessionToken } from "@/lib/session";

/** Kiosk APIs return 401 instead of redirecting to the web login page. */
export async function getActiveKioskId(): Promise<string | null> {
  const session = await decryptSession(await getSessionToken());
  if (!session || session.role !== "KIOSK") return null;
  const user = await prisma.user.findFirst({
    where: { id: session.userId, role: "KIOSK", isActive: true, isDeleted: false },
    select: { id: true },
  });
  return user?.id ?? null;
}
