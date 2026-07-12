import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { RequireAuth, RequireRole } from "@/auth/guards";
import { NotificationsProvider } from "@/notifications/NotificationsContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { PlainLayout } from "@/components/layout/PlainLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { HomePage } from "@/features/home/HomePage";
import { InventoryPage } from "@/features/inventory/InventoryPage";
import { CategoriesPage } from "@/features/categories/CategoriesPage";
import { GuidePage } from "@/features/guide/GuidePage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { UsersPage } from "@/features/users/UsersPage";

/** Authenticated users shouldn't see the auth screens. */
function PublicOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, initializing } = useAuth();
  if (initializing) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationsProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnly>
                  <LoginPage />
                </PublicOnly>
              }
            />

            {/* Public — no login required. Browsing inventory is open to
                anyone; only the Admin Panel (below) needs an account. The
                backend enforces this too (GET endpoints have no auth
                dependency; every write stays admin-gated). */}
            <Route element={<PlainLayout />}>
              <Route index element={<HomePage />} />
              <Route path="products" element={<InventoryPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="guide" element={<GuidePage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Admin Panel — the ONLY thing that still requires login. Not
                logged in -> /login (and back here after). Logged in but not
                admin -> bounced to Home. */}
            <Route path="admin" element={<RequireAuth />}>
              <Route
                element={
                  <RequireRole role="admin">
                    <AppLayout />
                  </RequireRole>
                }
              >
                <Route index element={<InventoryPage />} />
                <Route path="users" element={<UsersPage />} />
              </Route>
            </Route>

            {/* Legacy paths from before the redesign. */}
            <Route path="inventory" element={<Navigate to="/products" replace />} />
            <Route path="users" element={<Navigate to="/admin/users" replace />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
