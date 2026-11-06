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

const loginUserSelect = { id: true, email: true, role: true, passwordHash: true } as const;

/**
 * Resolves an active account by email or a linked person's national ID.
 * National IDs are optional and not unique in the data model, so ambiguous IDs
 * deliberately return null rather than authenticate the wrong account.
 */
export async function findActiveUserByIdentifier(identifier: string): Promise<AuthUserRecord | null> {
  const activeAccount = { isActive: true, isDeleted: false };

  if (!/^\d{13}$/.test(identifier)) {
    return prisma.user.findFirst({
      where: { ...activeAccount, email: identifier },
      select: loginUserSelect,
    });
  }

  const matches = await prisma.user.findMany({
    where: {
      ...activeAccount,
      OR: [
        { student: { is: { nationalId: identifier, isDeleted: false } } },
        { staff: { is: { nationalId: identifier, isDeleted: false } } },
        { guardianLinks: { some: { nationalId: identifier, isDeleted: false } } },
      ],
    },
    select: loginUserSelect,
    take: 2,
  });

  return matches.length === 1 ? matches[0] : null;
}
