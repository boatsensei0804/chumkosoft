import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { decryptSession, getSessionToken, type SessionPayload } from "@/lib/session";
import { ROLE_LABELS } from "@/features/auth/roles";

/**
 * Data Access Layer: the single, memoized place that verifies the session and
 * resolves the current user. Call these from Server Components, Server Actions,
 * and Route Handlers — never trust the client. `cache` dedupes calls within a
 * single render pass.
 */

/** Returns the verified session, or redirects to /login when unauthenticated. */
export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await decryptSession(await getSessionToken());
  if (!session) {
    redirect("/login");
  }
  return session;
});

export interface CurrentUser {
  id: string;
  email: string;
  role: Role;
  /** Linked staff record id, when the account belongs to a teacher/personnel; null otherwise. Used to scope teacher-owned data (attendance rosters). */
  staffId: string | null;
  displayName: string;
  /** Given name for informal greetings ("คุณ{firstName}"); null for accounts with no person record. */
  firstName: string | null;
  subtitle: string;
  initials: string;
}

function initialsFrom(firstName: string, lastName: string): string {
  return `${[...firstName][0] ?? ""}${[...lastName][0] ?? ""}`.trim() || "?";
}

/**
 * Resolves the authenticated user into a display DTO, joining the linked staff
 * or student record for their name. Redirects to /login if the account no
 * longer exists or was deactivated.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const session = await verifySession();

  const user = await prisma.user.findFirst({
    where: { id: session.userId, isDeleted: false, isActive: true },
    select: {
      id: true,
      email: true,
      role: true,
      staffId: true,
      staff: { select: { prefix: true, firstName: true, lastName: true, position: true } },
      student: { select: { prefix: true, firstName: true, lastName: true } },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const roleLabel = ROLE_LABELS[user.role];
  const person = user.staff ?? user.student;

  const displayName = person
    ? `${person.prefix ?? ""}${person.firstName} ${person.lastName}`.trim()
    : user.email;
  const subtitle = user.staff?.position ? `${roleLabel} · ${user.staff.position}` : roleLabel;
  const initials = person ? initialsFrom(person.firstName, person.lastName) : user.email.slice(0, 2).toUpperCase();

  return { id: user.id, email: user.email, role: user.role, staffId: user.staffId, displayName, firstName: person?.firstName ?? null, subtitle, initials };
});

/**
 * Authorizes the current user against an allowed set of roles. Unauthenticated
 * users are sent to /login (via `getCurrentUser`); authenticated users lacking the
 * role are sent to /unauthorized. Returns the user so callers can render with it.
 *
 * This is the authoritative, server-side RBAC check — call it in the layout/page
 * that owns a role-restricted surface. Hiding nav items is presentation only.
 */
export async function requireRoles(allowed: readonly Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!allowed.includes(user.role)) {
    redirect("/unauthorized");
  }
  return user;
}
