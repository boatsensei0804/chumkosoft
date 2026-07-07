import type { Role } from "@prisma/client";

/**
 * Pure role metadata + helpers (no server-only imports) so both server code
 * (DAL, RBAC guards) and client components (role-aware UI) can use them.
 */

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "ผู้ดูแลระบบ",
  TEACHER: "ครูและบุคลากร",
  STUDENT: "นักเรียน",
  PARENT: "ผู้ปกครอง",
  KIOSK: "จุดสแกนใบหน้า",
};

/** Roles that operate the staff-facing dashboard day to day. */
export const STAFF_ROLES: Role[] = ["ADMIN", "TEACHER"];

/** Roles that use the read-only self-service portal (students & families). */
export const PORTAL_ROLES: Role[] = ["STUDENT", "PARENT"];

export function hasRole(role: Role, allowed: readonly Role[]): boolean {
  return allowed.includes(role);
}

/** The landing surface for a role: staff → dashboard, kiosk → scan station, families → portal. */
export function homePathForRole(role: Role): string {
  if (STAFF_ROLES.includes(role)) return "/dashboard";
  if (role === "KIOSK") return "/scan";
  return "/portal";
}
