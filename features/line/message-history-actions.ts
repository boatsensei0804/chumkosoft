"use server";
import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/dal";
import { retryFailedLineDelivery } from "@/features/line/services/message-api-summary";
export async function retryFailedLineDeliveryAction(id: string) {
  await requireRoles(["ADMIN"]);
  const result = await retryFailedLineDelivery(id);
  revalidatePath("/dashboard/line/messages");
  return result;
}
