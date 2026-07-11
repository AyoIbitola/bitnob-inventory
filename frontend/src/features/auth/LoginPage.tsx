import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/api";
import { Button, InputField } from "@/components";
import { PasswordField } from "@/components/PasswordField";
import { USE_MOCK_API } from "@/config";
import { AuthShell } from "./AuthShell";

interface LocationState {
  from?: { pathname: string };
}

/** Sign-in screen. Copy is placeholder (flagged in DESIGN-NOTES). */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showResetHint, setShowResetHint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      heading="Welcome back"
      subheading="Enter your credentials to continue"
      footer={
        <>
          <p className="text-body-sm text-on-surface-variant">
            Need an account?{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Create one
            </Link>
          </p>
          {USE_MOCK_API && (
            <p className="mt-md rounded-lg bg-surface-container-low px-md py-sm text-body-sm text-on-surface-variant">
              <strong className="font-semibold">Demo mode.</strong> admin@bitnob.com / admin123 ·
              staff@bitnob.com / staff123
            </p>
          )}
        </>
      }
    >
      <form className="space-y-md" onSubmit={handleSubmit} noValidate>
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-error-container bg-error-container/50 px-md py-sm text-body-sm text-on-error-container"
          >
            {error}
          </div>
        )}

        <InputField
          label="Email address"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="space-y-xs">
          <PasswordField
            label="Password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex justify-end">
            <button
              type="button"
              className="text-body-sm text-primary hover:underline"
              aria-expanded={showResetHint ? "true" : "false"}
              onClick={() => setShowResetHint((v) => !v)}
            >
              Forgot password?
            </button>
          </div>
          {showResetHint && (
            <p className="rounded-lg bg-surface-container-low px-md py-sm text-body-sm text-on-surface-variant">
              Password resets aren&apos;t self-service yet. Ask your administrator to reset it for
              you.
            </p>
          )}
        </div>

        <Button type="submit" fullWidth loading={submitting}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
