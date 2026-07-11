import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { RequireAuth, RequireRole } from "@/auth/guards";
import { NotificationsProvider } from "@/notifications/NotificationsContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { InventoryPage } from "@/features/inventory/InventoryPage";
import { CategoriesPage } from "@/features/categories/CategoriesPage";
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
            <Route
              path="/register"
              element={
                <PublicOnly>
                  <RegisterPage />
                </PublicOnly>
              }
            />

            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                {/* Everyone: browse inventory, categories, own settings. */}
                <Route index element={<InventoryPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="settings" element={<SettingsPage />} />

                {/* Admin-only routes — hard-gated, inaccessible to staff. */}
                <Route element={<RequireRole role="admin" />}>
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="users" element={<UsersPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
