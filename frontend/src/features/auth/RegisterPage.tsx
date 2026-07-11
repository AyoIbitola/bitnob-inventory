import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/api";
import { Button, InputField } from "@/components";
import { PasswordField } from "@/components/PasswordField";
import { AuthShell } from "./AuthShell";

/** Simple, honest strength signal — length + variety, no false precision. */
function strengthOf(password: string): { score: 0 | 1 | 2 | 3; label: string } {
  if (!password) return { score: 0, label: "" };
  let points = 0;
  if (password.length >= 8) points++;
  if (password.length >= 12) points++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) points++;
  if (/\d/.test(password)) points++;
  if (/[^A-Za-z0-9]/.test(password)) points++;
  if (points <= 2) return { score: 1, label: "Weak" };
  if (points === 3) return { score: 2, label: "Good" };
  return { score: 3, label: "Strong" };
}

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
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const strength = strengthOf(password);

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
      subheading="Use your @withbitnob.com work email"
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

        <div className="space-y-xs">
          <PasswordField
            label="Password"
            autoComplete="new-password"
            required
            value={password}
            error={fieldErrors.password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {password && (
            <div className="flex items-center gap-sm">
              <div className="flex h-1 flex-1 gap-1" aria-hidden>
                {[1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={
                      "h-full flex-1 rounded-full transition-colors " +
                      (strength.score >= i
                        ? strength.score === 1
                          ? "bg-error"
                          : strength.score === 2
                            ? "bg-status-warning-fg"
                            : "bg-status-success-fg"
                        : "bg-surface-variant")
                    }
                  />
                ))}
              </div>
              <span className="text-body-sm text-on-surface-variant">{strength.label}</span>
            </div>
          )}
        </div>

        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          required
          value={confirm}
          error={fieldErrors.confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <Button type="submit" fullWidth loading={submitting}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
