import { setTimeout } from "node:timers/promises";

const secret = process.env.ADVISOR_LINE_DIGEST_SECRET;
const minute = 60_000;

if (!secret) {
  console.error("[Advisor LINE digest] Configure ADVISOR_LINE_DIGEST_SECRET in the production .env");
  process.exit(1);
}

while (true) {
  let retryDelay = 0;
  try {
    const response = await fetch("http://app:3000/api/internal/advisor-digest", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(10 * minute),
      redirect: "error",
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      console.error(`[Advisor LINE digest] HTTP ${response.status}, failed ${result?.failed ?? "unknown"}`);
      retryDelay = 4 * minute;
    } else if (result?.sent) {
      console.info(`[Advisor LINE digest] LINE accepted ${result.sent} daily summaries`);
    }
  } catch {
    console.error("[Advisor LINE digest] Could not reach the application");
  }
  await setTimeout(retryDelay + minute - Date.now() % minute);
}
