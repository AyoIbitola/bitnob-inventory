import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation, useOutletContext } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { Role } from "@/types";
import { Spinner } from "@/components/Spinner";

/** Full-screen boot spinner while the persisted session is being restored. */
function BootScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-primary">
      <Spinner className="h-8 w-8" label="Starting BitVault" />
    </div>
  );
}

/**
 * Gate for authenticated routes. Redirects to /login (preserving intended
 * destination) when there's no session. Server still enforces auth — this is
 * UX, not the security boundary.
 */
export function RequireAuth() {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <BootScreen />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

/**
 * Gate for role-restricted routes (e.g. admin-only Manage Inventory). Renders a
 * fallback instead of the route when the user lacks the role.
 */
export function RequireRole({ role, children }: { role: Role; children?: ReactNode }) {
  const { hasRole, initializing } = useAuth();
  // Forward the parent layout's outlet context (e.g. AppLayout's openNav) so
  // nested pages under this guard still receive it — a plain <Outlet/> here
  // would overwrite it with undefined.
  const outletContext = useOutletContext();
  if (initializing) return <BootScreen />;
  if (!hasRole(role)) return <Navigate to="/" replace />;
  return children ? <>{children}</> : <Outlet context={outletContext} />;
}

/**
 * Inline conditional render for role-specific UI (Actions column, Add/Edit/
 * Delete buttons). This is REAL conditional rendering — the elements never
 * enter the tree for unauthorized users, not CSS-hidden.
 */
export function RoleGate({ role, children }: { role: Role; children: ReactNode }) {
  const { hasRole } = useAuth();
  return hasRole(role) ? <>{children}</> : null;
}
