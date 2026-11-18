"use server";

import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const PATH = "/dashboard/emergencies";

export async function acknowledgeEmergencyAction(id: string): Promise<void> {
  const user = await requireRoles(STAFF_ROLES);
  if (!id || id.length > 40) return;
  const changed = await prisma.emergencyIncident.updateMany({
    where: { id, status: "OPEN" },
    data: { status: "ACKNOWLEDGED", acknowledgedById: user.id, acknowledgedAt: new Date() },
  });
  if (changed.count) {
    await logAudit({ actorId: user.id, action: "emergency.acknowledge", targetType: "emergencyIncident", targetId: id });
    revalidatePath(PATH);
  }
}

export async function resolveEmergencyAction(id: string): Promise<void> {
  const user = await requireRoles(STAFF_ROLES);
  if (!id || id.length > 40) return;
  const changed = await prisma.emergencyIncident.updateMany({
    where: { id, status: { in: ["OPEN", "ACKNOWLEDGED"] } },
    data: { status: "RESOLVED", resolvedById: user.id, resolvedAt: new Date() },
  });
  if (changed.count) {
    await logAudit({ actorId: user.id, action: "emergency.resolve", targetType: "emergencyIncident", targetId: id });
    revalidatePath(PATH);
  }
}
