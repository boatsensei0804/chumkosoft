import "server-only";

import type { Role } from "@prisma/client";
import { verifyPassword } from "@/lib/password";
import { findActiveUserByIdentifier } from "@/features/auth/repositories/user-repository";
import type { LoginInput } from "@/features/auth/schemas/login-schema";

export interface AuthenticatedUser {
  id: string;
  role: Role;
}

/**
 * Verifies credentials against the stored password hash. Returns the identity to
 * put in a session, or null when the email is unknown or the password is wrong —
 * the two cases are deliberately indistinguishable to prevent enumeration.
 */
export async function authenticate(input: LoginInput): Promise<AuthenticatedUser | null> {
  const user = await findActiveUserByIdentifier(input.identifier);
  if (!user) {
    return null;
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);
  if (!passwordMatches) {
    return null;
  }

  return { id: user.id, role: user.role };
}
