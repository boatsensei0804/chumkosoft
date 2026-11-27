import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/dal";

export default async function ZktecoDevicesPage() {
  await requireRoles(["ADMIN"]);
  redirect("/dashboard/kiosk#zkteco");
}
