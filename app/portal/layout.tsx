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
    <div className="min-h-dvh bg-bg">
      <a href="#portal-main" className="sr-only z-50 rounded-lg bg-card p-3 font-semibold text-brand-ink focus:not-sr-only focus:fixed focus:start-4 focus:top-4">ข้ามไปยังเนื้อหาหลัก</a>
      <PortalHeader user={user} />
      <main id="portal-main" tabIndex={-1} className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
