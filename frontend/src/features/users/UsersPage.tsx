import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useLayout } from "@/components/layout/AppLayout";
import { Table, type Column } from "@/components/Table";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Spinner } from "@/components/Spinner";
import { useAuth } from "@/auth/AuthContext";
import { formatDate } from "@/lib/format";
import type { User } from "@/types";
import { useSetAdmin, useUsers } from "./hooks";
import { AddUserModal } from "./AddUserModal";

/**
 * Admin-only user management: list users, promote/demote admins, add users.
 * Route is hard-gated by <RequireRole role="admin">; this page assumes admin.
 */
export function UsersPage() {
  const { openNav } = useLayout();
  const { user: currentUser } = useAuth();
  const { data: users, isLoading, isError, refetch } = useUsers();
  const setAdmin = useSetAdmin();
  const [addOpen, setAddOpen] = useState(false);

  // Which row's toggle is in flight (to show a spinner on just that row).
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function toggleAdmin(u: User) {
    setPendingId(u.id);
    try {
      await setAdmin.mutateAsync({ id: u.id, isAdmin: u.role !== "admin" });
    } finally {
      setPendingId(null);
    }
  }

  const columns: Column<User>[] = [
    {
      key: "email",
      header: "User",
      render: (u) => (
        <div className="flex items-center gap-md">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container text-label-caps font-bold text-on-secondary-container">
            {u.initials ?? u.email.slice(0, 2).toUpperCase()}
          </span>
          <span className="font-semibold text-on-surface">
            {u.email}
            {u.id === currentUser?.id && (
              <span className="ml-xs text-body-sm font-normal text-on-surface-variant">(you)</span>
            )}
          </span>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (u) => <Badge tone={u.role === "admin" ? "info" : "neutral"}>{u.role}</Badge>,
    },
    {
      key: "created",
      header: "Joined",
      hideBelow: "md",
      render: (u) => (
        <span className="text-body-sm text-on-surface-variant">
          {u.createdAt ? formatDate(u.createdAt) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Admin access",
      align: "right",
      render: (u) => {
        const isSelf = u.id === currentUser?.id;
        const busy = pendingId === u.id;
        return (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <Button
              variant={u.role === "admin" ? "danger-outline" : "secondary"}
              size="sm"
              loading={busy}
              // Guard against self-lockout: an admin can't demote themselves.
              disabled={isSelf && u.role === "admin"}
              onClick={() => toggleAdmin(u)}
            >
              {u.role === "admin" ? "Revoke admin" : "Make admin"}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Topbar title="Users" onOpenNav={openNav}>
        {isLoading && <Spinner className="ml-sm text-primary" />}
      </Topbar>

      <main className="space-y-lg p-lg">
        <div className="flex items-center justify-between">
          <p className="text-body-sm text-on-surface-variant">
            {users ? `${users.length} user${users.length === 1 ? "" : "s"}` : " "}
          </p>
          <Button icon="person_add" onClick={() => setAddOpen(true)}>
            Add User
          </Button>
        </div>

        <Table
          caption="Users"
          columns={columns}
          rows={users ?? []}
          rowKey={(u) => u.id}
          isLoading={isLoading}
          error={isError ? "Couldn't load users." : null}
          onRetry={() => refetch()}
          emptyState={<span className="text-on-surface-variant">No users yet.</span>}
        />
      </main>

      <AddUserModal open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
