import "server-only";

import { unstable_rethrow } from "next/navigation";
import { Prisma } from "@prisma/client";
import type { ActionResult } from "@/types/form";

/**
 * Runs a mutating action body and turns unexpected failures into a friendly
 * ActionResult instead of crashing to the error boundary. Framework control-flow
 * errors (redirect, notFound) are rethrown first so they still work. Known Prisma
 * errors get specific messages; everything else is logged and generalized.
 */
export async function runAction(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await fn();
  } catch (error) {
    // Must run before any handling: redirect()/notFound() throw internal errors.
    unstable_rethrow(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return { ok: false, message: "ข้อมูลนี้ซ้ำกับที่มีอยู่แล้วในระบบ" };
      }
      if (error.code === "P2025") {
        return { ok: false, message: "ไม่พบข้อมูลที่ต้องการ อาจถูกลบไปแล้ว" };
      }
      if (error.code === "P2003") {
        return { ok: false, message: "ลบไม่ได้ เพราะยังมีข้อมูลอื่นอ้างอิงอยู่" };
      }
    }

    console.error("[action error]", error);
    return { ok: false, message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง" };
  }
}
