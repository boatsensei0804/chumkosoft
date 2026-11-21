"use server";

import { placeOffering, moveSlot, removeSlot, type MutationResult } from "@/services/timetable-service";
import type { DayKey } from "@/features/timetable/types";
import { requireRoles } from "@/lib/dal";

export async function placeSlotAction(offeringId: string, day: DayKey, periodId: string): Promise<MutationResult> {
  await requireRoles(["ADMIN"]);
  return placeOffering(offeringId, day, periodId);
}

export async function moveSlotAction(slotId: string, day: DayKey, periodId: string): Promise<MutationResult> {
  await requireRoles(["ADMIN"]);
  return moveSlot(slotId, day, periodId);
}

export async function removeSlotAction(slotId: string): Promise<MutationResult> {
  await requireRoles(["ADMIN"]);
  return removeSlot(slotId);
}
