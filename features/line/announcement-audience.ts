import { z } from "zod";

export const announcementAudienceSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("all") }).strict(),
  z.object({ mode: z.literal("staff") }).strict(),
  z.object({ mode: z.literal("classrooms"), ids: z.array(z.string().min(1).max(150)).min(1).max(500) }).strict(),
  z.object({ mode: z.literal("people"), ids: z.array(z.string().min(1).max(150)).min(1).max(3000) }).strict(),
]);
export type AnnouncementAudience = z.infer<typeof announcementAudienceSchema>;
export interface AudienceOptions { classrooms: { id: string; label: string }[]; people: { id: string; label: string; kind: "parent" | "staff" }[] }
export interface AudienceCandidate { id: string; label: string; kind: "parent" | "staff"; classroomIds: string[]; lineUserId: string }

/** Select before deduplicating: a parent may be linked to children in several rooms. */
export function selectAudience(candidates: AudienceCandidate[], audience: AnnouncementAudience): AudienceCandidate[] {
  const ids = new Set("ids" in audience ? audience.ids : []);
  return candidates.filter((person) => audience.mode === "all" ||
    (audience.mode === "staff" && person.kind === "staff") ||
    (audience.mode === "people" && ids.has(person.id)) ||
    (audience.mode === "classrooms" && person.kind === "parent" && person.classroomIds.some((id) => ids.has(id))));
}
