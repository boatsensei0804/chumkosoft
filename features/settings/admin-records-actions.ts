"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction } from "@/lib/action-error";
import { requireRoles } from "@/lib/dal";
import type { ActionResult } from "@/types/form";
import { isTrashKind } from "./admin-records";
import { changeAdminAccount, purgeArchivedRecord, saveAdminAccount, type PurgeResult } from "./services/admin-records-service";

const idSchema = z.string().trim().min(1).max(100);
const changes = z.enum(["enable", "disable", "archive", "restore"]);
const emailSchema = z.string().trim().toLowerCase().email().max(254);
const passwordSchema = z.string().min(12).refine((value) => Buffer.byteLength(value, "utf8") <= 72);

function revalidateRecords() {
  revalidatePath("/dashboard", "layout");
}

export async function purgeRecordAction(kind: string, id: string): Promise<PurgeResult> {
  return runAction(async () => {
    const actor = await requireRoles(["ADMIN"]);
    if (!isTrashKind(kind) || !idSchema.safeParse(id).success) return { ok: false, message: "รายการไม่ถูกต้อง" };
    const result = await purgeArchivedRecord(actor.id, kind, id);
    if (result.ok) revalidateRecords();
    return result;
  });
}

export async function changeAdminAction(id: string, change: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireRoles(["ADMIN"]);
    const parsed = changes.safeParse(change);
    if (!parsed.success || !idSchema.safeParse(id).success) return { ok: false, message: "รายการไม่ถูกต้อง" };
    const result = await changeAdminAccount(actor.id, id, parsed.data);
    if (result.ok) revalidateRecords();
    return result;
  });
}

export async function saveAdminAction(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireRoles(["ADMIN"]);
    const id = idSchema.nullable().safeParse(form.get("id"));
    const email = emailSchema.safeParse(form.get("email"));
    const password = passwordSchema.safeParse(form.get("password"));
    if (!id.success) return { ok: false, message: "บัญชีไม่ถูกต้อง" };
    if (!email.success) return { ok: false, message: "กรุณากรอกอีเมลให้ถูกต้อง" };
    if (id.data === null && !password.success) {
      return { ok: false, message: "รหัสผ่านต้องยาวอย่างน้อย 12 ตัวอักษร และไม่เกิน 72 ไบต์" };
    }
    const result = await saveAdminAccount(actor.id, id.data, email.data, password.data ?? "");
    if (result.ok) revalidateRecords();
    return result;
  });
}
