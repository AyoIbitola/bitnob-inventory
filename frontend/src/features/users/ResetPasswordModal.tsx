import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { PasswordField } from "@/components/PasswordField";
import { useToast } from "@/components/Toast";
import { ApiError } from "@/api";
import type { User } from "@/types";
import { useResetPassword } from "./hooks";

/** Cryptographically-random temp password, so admins don't invent weak ones. */
function generatePassword(length = 14): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => alphabet[n % alphabet.length]).join("");
}

interface ResetPasswordModalProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Admin resets a user's password. This is the ONLY recovery path — there is no
 * self-service email reset — so it's what "Forgot password?" points people to.
 */
export function ResetPasswordModal({ user, open, onClose }: ResetPasswordModalProps) {
  const resetPassword = useResetPassword();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPassword("");
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");

    try {
      await resetPassword.mutateAsync({ id: user.id, newPassword: password });
      toast(`Password reset for ${user.email}.`);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reset the password.");
    }
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(password);
      toast("Password copied to clipboard.");
    } catch {
      toast("Couldn't copy — copy it manually.", "error");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reset password"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={resetPassword.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="reset-password-form" loading={resetPassword.isPending}>
            Reset password
          </Button>
        </>
      }
    >
      <form id="reset-password-form" className="space-y-md" onSubmit={handleSubmit} noValidate>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-error-container bg-error-container/50 px-md py-sm text-body-sm text-on-error-container"
          >
            {error}
          </p>
        )}
        <p className="text-body-sm text-on-surface-variant">
          Set a new password for{" "}
          <span className="font-semibold text-on-surface">{user?.email}</span>. Their current
          password stops working immediately.
        </p>
        <PasswordField
          label="New password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex flex-wrap gap-sm">
          <Button
            variant="secondary"
            size="sm"
            icon="casino"
            onClick={() => setPassword(generatePassword())}
          >
            Generate
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon="content_copy"
            disabled={!password}
            onClick={copyPassword}
          >
            Copy
          </Button>
        </div>
      </form>
    </Modal>
  );
}
