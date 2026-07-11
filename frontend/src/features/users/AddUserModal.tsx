import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { InputField } from "@/components/FormField";
import { PasswordField } from "@/components/PasswordField";
import { useToast } from "@/components/Toast";
import { ApiError } from "@/api";
import { useCreateUser } from "./hooks";

/** Cryptographically-random temp password, so admins don't invent weak ones. */
function generatePassword(length = 14): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => alphabet[n % alphabet.length]).join("");
}

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Admin creates a staff account. New users are always non-admin; promote them
 * from the table afterwards. Uses /auth/register but does not affect the
 * admin's own session.
 */
export function AddUserModal({ open, onClose }: AddUserModalProps) {
  const createUser = useCreateUser();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEmail("");
      setPassword("");
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    try {
      await createUser.mutateAsync({ email, password });
      toast(`Account created for ${email}.`);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the user.");
    }
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(password);
      toast("Password copied to clipboard.");
    } catch {
      toast("Couldn't copy — select and copy it manually.", "error");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add User"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={createUser.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="add-user-form" loading={createUser.isPending}>
            Create User
          </Button>
        </>
      }
    >
      <form id="add-user-form" className="space-y-md" onSubmit={handleSubmit} noValidate>
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
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordField
          label="Temporary password"
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
        <p className="text-body-sm text-on-surface-variant">
          Share this password with the user securely. They&apos;re created as staff — promote to
          admin from the table if needed.
        </p>
      </form>
    </Modal>
  );
}
