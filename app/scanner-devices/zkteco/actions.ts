"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRoles } from "@/lib/dal";
import { runAction } from "@/lib/action-error";
import type { ActionResult } from "@/types/form";
import { admsDeviceSchema, saveAdmsDevice, setAdmsDeviceEnabled } from "@/features/faces/services/zkteco-devices";

export async function manageAdmsDevice(_state: ActionResult, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireRoles(["ADMIN"]);
    const operation = form.get("operation");
    const rawId = form.get("id");
    const id = rawId ? z.uuid().safeParse(rawId).data : undefined;
    if (rawId && !id) return { ok: false, message: "ไม่พบเครื่องสแกนที่เลือก" };

    let result: ActionResult;
    if (operation === "save") {
      const input = admsDeviceSchema.safeParse(Object.fromEntries(form));
      if (!input.success) return { ok: false, message: "ตรวจชื่อเครื่อง สถานที่ เลข Serial และบัญชีจุดสแกน" };
      result = await saveAdmsDevice(input.data, actor.id, id);
    } else if (id && (operation === "enable" || operation === "disable")) {
      result = await setAdmsDeviceEnabled(id, operation === "enable", actor.id);
    } else {
      return { ok: false, message: "ไม่พบคำสั่งจัดการเครื่องสแกน" };
    }
    if (result.ok) {
      revalidatePath("/scanner-devices/zkteco");
      revalidatePath("/scanner-devices");
    }
    return result;
  });
}
