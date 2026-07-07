import "server-only";

import prisma from "@/lib/prisma";

export interface AuditEntry {
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  detail?: string;
}

/**
 * Appends an audit record. Best-effort: auditing must never break the operation
 * it records, so failures are swallowed (and logged) rather than thrown.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        detail: entry.detail ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write", entry.action, error);
  }
}
