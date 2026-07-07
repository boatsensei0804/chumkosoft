"use client";

import { useActionState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { loginAction, type LoginFormState } from "@/features/auth/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const initialState: LoginFormState = {};

export default function LoginForm({ t }: { t: Dictionary["login"] }): React.ReactNode {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error && (
        <Alert
          severity="error"
          role="alert"
          sx={{
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--danger-soft)",
            color: "var(--ink-strong)",
            "& .MuiAlert-icon": { color: "var(--danger)" },
          }}
        >
          {state.error}
        </Alert>
      )}

      <TextField
        name="email"
        type="email"
        label={t.email}
        autoComplete="email"
        defaultValue={state.email}
        required
        fullWidth
        autoFocus
        disabled={isPending}
      />

      <TextField
        name="password"
        type="password"
        label={t.password}
        autoComplete="current-password"
        required
        fullWidth
        disabled={isPending}
      />

      <Button type="submit" variant="contained" size="large" fullWidth disabled={isPending}>
        {isPending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
