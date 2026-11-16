"use server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireRoles } from "@/lib/dal";
import { setLinePushEnabled, type LineDeliveryState } from "@/features/line/services/line-delivery-settings";
export async function saveLineDeliveryAction(value: boolean): Promise<{ ok: boolean; message: string; state?: LineDeliveryState }> {
  const user = await requireRoles(["ADMIN"]);
  if (typeof value !== "boolean") return { ok: false, message: "สถานะการส่งไม่ถูกต้อง" };
  try {
    const state = await setLinePushEnabled(value, user);
    for (const path of ["/dashboard/line", "/dashboard/line-announcements", "/dashboard/settings"]) revalidatePath(path);
    return { ok: true, state, message: value ? "เปิดการส่งแจ้งเตือนและประกาศ LINE แล้ว" : "พักการส่งแจ้งเตือนและประกาศ LINE แล้ว" };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[saveLineDeliveryAction] Could not save delivery switch");
    return { ok: false, message: "บันทึกไม่สำเร็จ กรุณาโหลดหน้าเพื่อตรวจสถานะล่าสุด" };
  }
}
