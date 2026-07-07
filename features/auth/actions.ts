"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { headers } from "next/headers";
import { createSession, deleteSession } from "@/lib/session";
import { authenticate } from "@/features/auth/services/auth-service";
import { loginSchema } from "@/features/auth/schemas/login-schema";
import { homePathForRole } from "@/features/auth/roles";
import { rateLimit } from "@/lib/rate-limit";

const LOGIN_MAX_ATTEMPTS = 8;
const LOGIN_WINDOW_SECONDS = 60;

async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export interface LoginFormState {
  error?: string;
  /** Echoed back so the field survives a failed submit. */
  email?: string;
}

/**
 * Server action for the login form (used with `useActionState`). Validates input,
 * authenticates, issues a session cookie, then redirects to the dashboard. On any
 * failure it returns a single generic message — never revealing which field was wrong.
 */
export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const email = typeof formData.get("email") === "string" ? String(formData.get("email")) : "";
    return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง", email };
  }

  try {
    // Blunt brute force: cap attempts per IP+email per minute (fails open if Redis is down).
    const ip = await clientIp();
    const limited = await rateLimit(`login:${ip}:${parsed.data.email}`, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_SECONDS);
    if (!limited.ok) {
      return { error: "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่", email: parsed.data.email };
    }

    const user = await authenticate(parsed.data);
    if (!user) {
      return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง", email: parsed.data.email };
    }
    await createSession(user.id, user.role);
    redirect(homePathForRole(user.role));
  } catch (error) {
    unstable_rethrow(error); // let the success redirect propagate
    console.error("[loginAction]", error);
    return { error: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง", email: parsed.data.email };
  }
}

/** Clears the session cookie and returns to the login screen. */
export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
