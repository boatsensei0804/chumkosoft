"use server";
import { createHash } from "node:crypto";
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
  identifier?: string;
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
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const identifier =
      typeof formData.get("identifier") === "string"
        ? String(formData.get("identifier"))
        : "";
    return {
      error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
      identifier,
    };
  }

  try {
    const ip = await clientIp();

    // Hash เลขบัตรก่อนใช้เป็นส่วนหนึ่งของ key ใน Redis
    const rateLimitIdentifier = /^\d{13}$/.test(parsed.data.identifier)
      ? createHash("sha256").update(parsed.data.identifier).digest("hex")
      : parsed.data.identifier;

    const limited = await rateLimit(
      `login:${ip}:${rateLimitIdentifier}`,
      LOGIN_MAX_ATTEMPTS,
      LOGIN_WINDOW_SECONDS,
    );

    if (!limited.ok) {
      return {
        error: "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่",
        identifier: parsed.data.identifier,
      };
    }

    const user = await authenticate(parsed.data);

    if (!user) {
      return {
        error: "ข้อมูลเข้าสู่ระบบหรือรหัสผ่านไม่ถูกต้อง",
        identifier: parsed.data.identifier,
      };
    }

    await createSession(user.id, user.role);
    redirect(homePathForRole(user.role));
  } catch (error) {
    unstable_rethrow(error);
    console.error("[loginAction]", error);
    return {
      error: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง",
      identifier: parsed.data.identifier,
    };
  }
}

/** Clears the session cookie and returns to the login screen. */
export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
