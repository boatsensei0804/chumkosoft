"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type LoginFormState } from "@/features/auth/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const initialState: LoginFormState = {};

export default function LoginForm({ t }: { t: Dictionary["login"] }): React.ReactNode {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-danger-soft px-3 py-2 text-sm font-medium text-ink-strong">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-email">{t.email}</Label>
        <Input id="login-email" name="email" type="email" autoComplete="email" defaultValue={state.email} required autoFocus disabled={isPending} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-password">{t.password}</Label>
        <Input id="login-password" name="password" type="password" autoComplete="current-password" required disabled={isPending} />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
