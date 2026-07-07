import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { homePathForRole } from "@/features/auth/roles";

export const dynamic = "force-dynamic";

export default async function Home(): Promise<never> {
  // Send each viewer to their role's home (getCurrentUser redirects to /login if not signed in).
  const user = await getCurrentUser();
  redirect(homePathForRole(user.role));
}
