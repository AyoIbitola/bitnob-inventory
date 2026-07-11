import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { InputField } from "@/components/FormField";
import { ApiError } from "@/api";
import { useCreateUser } from "./hooks";

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
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the user.");
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
        <InputField
          label="Temporary password"
          type="text"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-body-sm text-on-surface-variant">
          Share this password with the user. They&apos;ll be created as staff — promote to admin
          from the table if needed.
        </p>
      </form>
    </Modal>
  );
}
