import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/api";
import { Button, InputField } from "@/components";
import { AuthShell } from "./AuthShell";

/**
 * Self-service account creation. The backend `/auth/register` is public and
 * always creates a NON-admin (staff) user; an existing admin promotes them
 * afterwards via the Users page. On success the new user is signed straight in.
 *
 * NOTE: open self-registration on an internal tool is a policy decision. The
 * backend allows it, so the frontend can't restrict it meaningfully — if you
 * want it gated (email-domain allowlist, invite-only, admin-created only),
 * that's a backend change. Flagged in DESIGN-NOTES.
 */
export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const next: typeof fieldErrors = {};
    if (password.length < 8) next.password = "Use at least 8 characters.";
    if (confirm !== password) next.confirm = "Passwords don't match.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await signUp({ email, password });
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't create your account. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      heading="Create your account"
      subheading="Register to access the inventory workspace"
      footer={
        <p className="text-body-sm text-on-surface-variant">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
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

        <InputField
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          value={password}
          error={fieldErrors.password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <InputField
          label="Confirm password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          value={confirm}
          error={fieldErrors.confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <button
          type="button"
          className="text-body-sm text-on-surface-variant hover:text-on-surface"
          onClick={() => setShowPassword((v) => !v)}
        >
          {showPassword ? "Hide passwords" : "Show passwords"}
        </button>

        <Button type="submit" fullWidth loading={submitting}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
