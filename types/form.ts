/**
 * Standard result shape returned by form Server Actions and consumed by
 * `useActionState`. `ok: true` signals success (the UI closes the dialog and
 * refreshes); otherwise `message` is a summary and `fieldErrors` maps field name
 * → message for inline display.
 */
export interface ActionResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

/** Neutral initial state for `useActionState` — not an error, shows nothing. */
export const idleAction: ActionResult = { ok: false };
