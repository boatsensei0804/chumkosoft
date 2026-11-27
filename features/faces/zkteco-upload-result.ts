import { z } from "zod";

export const admsUploadResultSchema = z.union([
  z.object({
    outcome: z.literal("status_or_verification"),
    status: z.number().int().min(0).max(999).nullable(),
    verification: z.number().int().min(0).max(999).nullable(),
  }),
  z.object({
    outcome: z.enum([
      "synced", "before_mapping", "invalid_body", "invalid_row", "invalid_timestamp",
      "ambiguous_pin", "unmapped_pin", "attendance_rule", "unavailable",
    ]),
  }),
]);

export type AdmsUploadResult = z.infer<typeof admsUploadResultSchema>;
