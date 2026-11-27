"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRoles } from "@/lib/dal";
import { runAction } from "@/lib/action-error";
import type { ActionResult } from "@/types/form";
import { maxPinMappingCsvBytes, parsePinMappingCsv, scannerPinMappingSchema, scannerPinSchema } from "@/features/faces/zkteco-pin-mapping";
import { legacyScannerPinMap, savePinMappings, unlinkScannerPin } from "@/features/faces/services/zkteco-pin-mapping";

export async function manageScannerPinMappings(_state: ActionResult, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireRoles(["ADMIN"]);
    const deviceId = z.uuid().safeParse(form.get("deviceId"));
    if (!deviceId.success) return { ok: false, message: "ไม่พบเครื่องสแกน" };

    const operation = form.get("operation");
    let result: ActionResult;
    switch (operation) {
      case "save": {
        const row = scannerPinMappingSchema.safeParse({ pin: form.get("pin"), studentCode: form.get("studentCode") });
        if (!row.success) return { ok: false, message: "กรอกรหัสบนเครื่องเป็นตัวเลข 1–9 หลักและระบุรหัสนักเรียน" };
        result = await savePinMappings(deviceId.data, [row.data], actor.id, form.get("replace") === "on");
        break;
      }
      case "import": {
        const file = form.get("file");
        if (!(file instanceof File) || !file.size || file.size > maxPinMappingCsvBytes) {
          return { ok: false, message: "เลือกไฟล์ CSV ขนาดไม่เกิน 128 KB" };
        }
        let text: string;
        try {
          text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
        } catch {
          return { ok: false, message: "บันทึกไฟล์เป็น CSV UTF-8 แล้วนำเข้าอีกครั้ง" };
        }
        const parsed = parsePinMappingCsv(text);
        if ("error" in parsed) return { ok: false, message: parsed.error };
        result = await savePinMappings(deviceId.data, parsed.rows, actor.id);
        break;
      }
      case "legacy": {
        const pin = scannerPinSchema.safeParse(form.get("pin"));
        const legacy = legacyScannerPinMap(deviceId.data);
        if (!pin.success || !legacy[pin.data]) return { ok: false, message: "ไม่พบคู่รหัสเดิม" };
        result = await savePinMappings(deviceId.data, [{ pin: pin.data, studentCode: legacy[pin.data] }], actor.id);
        break;
      }
      case "unlink": {
        const pin = scannerPinSchema.safeParse(form.get("pin"));
        if (!pin.success) return { ok: false, message: "รหัสบนเครื่องไม่ถูกต้อง" };
        result = await unlinkScannerPin(deviceId.data, pin.data, actor.id);
        break;
      }
      default:
        return { ok: false, message: "ไม่พบคำสั่งจัดการคู่รหัส" };
    }

    if (result.ok) {
      revalidatePath("/scanner-devices/pin-mappings");
      revalidatePath("/dashboard/kiosk");
    }
    return result;
  });
}
