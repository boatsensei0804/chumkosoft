import { describe, it, expect } from "vitest";
import { homePathForRole, hasRole, STAFF_ROLES, PORTAL_ROLES, ROLE_LABELS } from "@/features/auth/roles";

describe("homePathForRole", () => {
  it("routes staff to the dashboard", () => {
    expect(homePathForRole("ADMIN")).toBe("/dashboard");
    expect(homePathForRole("TEACHER")).toBe("/dashboard");
  });
  it("routes the kiosk to the scan station", () => {
    expect(homePathForRole("KIOSK")).toBe("/scan");
  });
  it("routes students and parents to the portal", () => {
    expect(homePathForRole("STUDENT")).toBe("/portal");
    expect(homePathForRole("PARENT")).toBe("/portal");
  });
});

describe("role sets", () => {
  it("hasRole checks membership", () => {
    expect(hasRole("ADMIN", STAFF_ROLES)).toBe(true);
    expect(hasRole("STUDENT", STAFF_ROLES)).toBe(false);
    expect(hasRole("PARENT", PORTAL_ROLES)).toBe(true);
  });
  it("labels every role", () => {
    for (const role of ["ADMIN", "TEACHER", "STUDENT", "PARENT", "KIOSK"] as const) {
      expect(ROLE_LABELS[role]).toBeTruthy();
    }
  });
});
