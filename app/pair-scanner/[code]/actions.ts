"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authenticate } from "@/features/auth/services/auth-service";
import { loginSchema } from "@/features/auth/schemas/login-schema";
import { approveScannerPairing, USER_CODE_PATTERN } from "@/features/faces/services/scanner-pairing";
import { getActiveKioskId } from "@/features/faces/services/scanner-api-auth";
import { rateLimit } from "@/lib/rate-limit";

export async function approvePairingAction(formData: FormData): Promise<void> {
  const code = formData.get("code");
  if (typeof code !== "string" || !USER_CODE_PATTERN.test(code)) redirect("/login");
  const back = `/pair-scanner/${code}`;
  let kioskId = await getActiveKioskId();

  if (!kioskId) {
    const input = loginSchema.safeParse({
      identifier: formData.get("identifier"),
      password: formData.get("password"),
    });
    if (!input.success) redirect(`${back}?error=login`);
    const h = await headers();
    const ip = h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? "unknown";
    const identifierHash = createHash("sha256").update(input.data.identifier).digest("hex");
    const limited = await rateLimit(`scanner-pair-login:${ip}:${identifierHash}`, 5, 60);
    if (!limited.ok) redirect(`${back}?error=limited`);
    const user = await authenticate(input.data);
    if (!user || user.role !== "KIOSK") redirect(`${back}?error=login`);
    kioskId = user.id;
  }

  const approved = await approveScannerPairing(code, kioskId);
  if (!approved) redirect(`${back}?error=expired`);
  redirect(`${back}?connected=1`);
}
