import { ReactNode } from "react";
import { redirect } from "next/navigation";
import AppShell from "@/features/dashboard/components/app-shell";
import { getCurrentUser } from "@/lib/dal";
import { STAFF_ROLES, homePathForRole } from "@/features/auth/roles";
import { formatThaiWeekdayShort } from "@/utils/thai-date";

export default async function DashboardLayout({ children }: { children: ReactNode }): Promise<ReactNode> {
  // The staff-facing dashboard is for ADMIN/TEACHER only; other roles are sent
  // to their own home surface. This is the authoritative gate for /dashboard.
  const user = await getCurrentUser();
  if (!STAFF_ROLES.includes(user.role)) {
    redirect(homePathForRole(user.role));
  }
  const today = formatThaiWeekdayShort(new Date());
  return (
    <AppShell user={user} today={today}>
      {children}
    </AppShell>
  );
}
