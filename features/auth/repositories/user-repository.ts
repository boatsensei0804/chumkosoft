import "server-only";

import type { Role } from "@prisma/client";
import prisma from "@/lib/prisma";

/** The minimum an active account needs for password verification + session issue. */
export interface AuthUserRecord {
  id: string;
  email: string;
  role: Role;
  passwordHash: string;
}

/**
 * Loads an active, non-deleted account by email for the login flow. Returns null
 * when no such account exists — callers must not distinguish "unknown email" from
 * "wrong password" in messaging, to avoid account enumeration.
 */
export async function findActiveUserByEmail(email: string): Promise<AuthUserRecord | null> {
  return prisma.user.findFirst({
    where: { email, isActive: true, isDeleted: false },
    select: { id: true, email: true, role: true, passwordHash: true },
  });
}
