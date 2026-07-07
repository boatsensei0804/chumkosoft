"use server";

import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/dal";
import { STAFF_ROLES } from "@/features/auth/roles";
import { roomSchema } from "@/features/rooms/schemas/room-schema";
import { createRoomRecord, updateRoomRecord, deleteRoomRecord } from "@/features/rooms/services/room-service";
import { fieldErrorsFromZod } from "@/utils/zod";
import { runAction } from "@/lib/action-error";
import type { ActionResult } from "@/types/form";

const ROOMS_PATH = "/dashboard/rooms";

function toText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function saveRoomAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(STAFF_ROLES);

    const id = toText(formData.get("id"));
    const name = toText(formData.get("name"));
    const building = toText(formData.get("building"));
    const capacityRaw = toText(formData.get("capacity"));

    const parsed = roomSchema.safeParse({
      code: formData.get("code"),
      name: name === "" ? null : name,
      building: building === "" ? null : building,
      capacity: capacityRaw === "" ? null : Number(capacityRaw),
    });
    if (!parsed.success) {
      return { ok: false, message: "กรุณาตรวจสอบข้อมูล", fieldErrors: fieldErrorsFromZod(parsed.error) };
    }

    const result = id ? await updateRoomRecord(id, parsed.data) : await createRoomRecord(parsed.data);
    if (result.ok) revalidatePath(ROOMS_PATH);
    return result;
  });
}

export async function deleteRoomAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(STAFF_ROLES);
    const result = await deleteRoomRecord(id);
    if (result.ok) revalidatePath(ROOMS_PATH);
    return result;
  });
}
