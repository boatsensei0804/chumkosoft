import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/dal";

/** Legacy web scan URL now leads to desktop scanner management. */
export default async function ScanPage(): Promise<never> {
  await requireRoles(["ADMIN", "KIOSK"]);
  redirect("/scanner-devices");
}
