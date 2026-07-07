import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { PORTAL_ROLES, homePathForRole } from "@/features/auth/roles";
import PortalHeader from "@/features/portal/components/portal-header";

export default async function PortalLayout({ children }: { children: ReactNode }): Promise<ReactNode> {
  // The portal is for STUDENT/PARENT; every other role has its own home.
  const user = await getCurrentUser();
  if (!PORTAL_ROLES.includes(user.role)) {
    redirect(homePathForRole(user.role));
  }

  return (
    <div
      className="min-h-dvh"
      style={{ background: "linear-gradient(180deg, var(--surface) 0%, oklch(0.955 0.02 254) 100%)" }}
    >
      <PortalHeader user={user} />
      <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
