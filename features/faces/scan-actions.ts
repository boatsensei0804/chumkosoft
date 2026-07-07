"use server";

import { requireRoles } from "@/lib/dal";
import { descriptorSchema } from "@/features/faces/schemas/face-schema";
import { identifyFace, commitCheckIn, type IdentifyResult, type ScanResult } from "@/features/faces/services/scan-service";

/**
 * Kiosk face identification (no write). The browser sends a descriptor computed
 * from the camera frame; the server matches it against enrolled faces. Only the
 * KIOSK station (or an ADMIN inspecting) may call this.
 */
export async function identifyFaceAction(descriptor: number[]): Promise<IdentifyResult> {
  await requireRoles(["KIOSK", "ADMIN"]);
  const parsed = descriptorSchema.safeParse(descriptor);
  if (!parsed.success) {
    return { status: "no_match" };
  }
  return identifyFace(parsed.data);
}

/** Records the check-in after the kiosk has identified + liveness-gated the face. */
export async function confirmCheckInAction(studentId: string): Promise<ScanResult> {
  const user = await requireRoles(["KIOSK", "ADMIN"]);
  if (typeof studentId !== "string" || studentId === "") {
    return { status: "no_match" };
  }
  return commitCheckIn(studentId, user.id);
}
