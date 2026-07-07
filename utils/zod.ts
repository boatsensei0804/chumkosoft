import type { ZodError } from "zod";

/** Flattens a ZodError into a field → first-message map for inline form errors. */
export function fieldErrorsFromZod(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !(key in out)) {
      out[key] = issue.message;
    }
  }
  return out;
}
