/** Only the app's own login page may create or claim a browser login challenge. */
export function isAllowedQrLoginOrigin(request: Request): boolean {
  const rawOrigin = request.headers.get("origin");
  if (!rawOrigin) return false;
  try {
    const origin = new URL(rawOrigin);
    if (origin.origin === "https://chumkosoft.com") return true;
    return process.env.NODE_ENV !== "production" && origin.origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
