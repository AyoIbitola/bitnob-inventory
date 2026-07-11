import { useMemo, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useLayout } from "@/components/layout/AppLayout";
import { Table, type Column } from "@/components/Table";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { SelectField } from "@/components/FormField";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/api";
import { formatDate } from "@/lib/format";
import type { Role, User } from "@/types";
import { useSetAdmin, useUsers } from "./hooks";
import { AddUserModal } from "./AddUserModal";

/**
 * Admin-only user management. The route is hard-gated by <RequireRole>, and the
 * backend independently rejects non-admins on GET /users (403), so this list is
 * never reachable by staff.
 */
export function UsersPage() {
  const { openNav } = useLayout();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const { data: users, isLoading, isError, refetch } = useUsers();
  const setAdmin = useSetAdmin();

  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  /** Granting admin is high-consequence and hard to undo — always confirm. */
  const [confirmTarget, setConfirmTarget] = useState<User | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users ?? []).filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (q && !u.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [users, search, roleFilter]);

  async function applyAdmin(user: User, isAdmin: boolean) {
    try {
      await setAdmin.mutateAsync({ id: user.id, isAdmin });
      toast(
        isAdmin ? `${user.email} is now an admin.` : `Admin access revoked for ${user.email}.`,
      );
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't update that user.", "error");
    } finally {
      setConfirmTarget(null);
    }
  }

  const columns: Column<User>[] = [
    {
      key: "email",
      header: "User",
      render: (u) => (
        <div className="flex items-center gap-md">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary-container text-label-caps font-bold text-on-secondary-container">
            {u.initials ?? u.email.slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-on-surface">{u.email}</span>
            {u.id === currentUser?.id && (
              <span className="text-body-sm text-on-surface-variant">You</span>
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
        const busy = setAdmin.isPending && setAdmin.variables?.id === u.id;
        return (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <Button
              variant={u.role === "admin" ? "danger-outline" : "secondary"}
              size="sm"
              loading={busy}
              // Self-lockout guard: an admin can't strip their own access.
              disabled={isSelf && u.role === "admin"}
              title={
                isSelf && u.role === "admin" ? "You can't revoke your own admin access" : undefined
              }
              onClick={() =>
                u.role === "admin" ? applyAdmin(u, false) : setConfirmTarget(u)
              }
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
      <Topbar title="Users" onOpenNav={openNav} />

      <main className="space-y-lg p-md md:p-lg">
        <div className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-1 flex-wrap items-end gap-md">
            <div className="relative w-full sm:w-72">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email"
                aria-label="Search users by email"
                className="h-11 w-full rounded-lg border border-outline-variant bg-surface-container-low pl-10 pr-md text-body-md focus-ring"
              />
            </div>
            <SelectField
              label="Role"
              wrapperClassName="w-full sm:w-40"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as Role | "")}
            >
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </SelectField>
          </div>

          <Button icon="person_add" onClick={() => setAddOpen(true)} className="w-full sm:w-auto">
            Add User
          </Button>
        </div>

        <p aria-live="polite" className="text-body-sm text-on-surface-variant">
          {isLoading
            ? "Loading users…"
            : `${rows.length} of ${users?.length ?? 0} user${users?.length === 1 ? "" : "s"}`}
        </p>

        <Table
          caption="Users"
          columns={columns}
          rows={rows}
          rowKey={(u) => u.id}
          isLoading={isLoading}
          error={isError ? "Couldn't load users." : null}
          onRetry={() => refetch()}
          renderCard={(u) => (
            <div className="flex items-center justify-between gap-md">
              <div className="min-w-0">
                <span className="block truncate font-semibold text-on-surface">{u.email}</span>
                <div className="mt-xs">
                  <Badge tone={u.role === "admin" ? "info" : "neutral"}>{u.role}</Badge>
                </div>
              </div>
              <Button
                variant={u.role === "admin" ? "danger-outline" : "secondary"}
                size="sm"
                disabled={u.id === currentUser?.id && u.role === "admin"}
                onClick={() => (u.role === "admin" ? applyAdmin(u, false) : setConfirmTarget(u))}
              >
                {u.role === "admin" ? "Revoke" : "Make admin"}
              </Button>
            </div>
          )}
          emptyState={
            <div className="flex flex-col items-center gap-sm text-on-surface-variant">
              <Icon name="group" className="text-3xl text-outline-variant" />
              <p className="font-semibold text-on-surface">No matching users</p>
              <p>Try a different search or role filter.</p>
            </div>
          }
        />
      </main>

      <AddUserModal open={addOpen} onClose={() => setAddOpen(false)} />

      {/* Granting admin is a privilege escalation — never a bare one-click. */}
      <Modal
        open={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        role="alertdialog"
        title="Grant admin access?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmTarget(null)}
              disabled={setAdmin.isPending}
            >
              Cancel
            </Button>
            <Button
              loading={setAdmin.isPending}
              onClick={() => confirmTarget && applyAdmin(confirmTarget, true)}
            >
              Grant admin
            </Button>
          </>
        }
      >
        <p>
          <span className="font-bold text-on-surface">{confirmTarget?.email}</span> will be able to
          add, edit and delete inventory, manage users, and grant admin access to others.
        </p>
      </Modal>
    </>
  );
}
