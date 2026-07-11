import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { RequireAuth, RequireRole } from "@/auth/guards";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { InventoryPage } from "@/features/inventory/InventoryPage";
import { UsersPage } from "@/features/users/UsersPage";
import { CategoriesPage } from "@/features/categories/CategoriesPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { SettingsPage } from "@/features/settings/SettingsPage";

/** Send already-authenticated users away from /login. */
function LoginRoute() {
  const { isAuthenticated, initializing } = useAuth();
  if (initializing) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <LoginPage />;
}

/** Send already-authenticated users away from /register too. */
function RegisterRoute() {
  const { isAuthenticated, initializing } = useAuth();
  if (initializing) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <RegisterPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/register" element={<RegisterRoute />} />

          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              {/* Dashboard IS the inventory workspace — role-adaptive (staff
                  read-only; admin gets Add/Edit/Delete via RoleGate). */}
              <Route index element={<InventoryPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="reports" element={<ReportsPage />} />

              {/* Admin-only routes (hard-gated by role — inaccessible to staff). */}
              <Route element={<RequireRole role="admin" />}>
                <Route path="users" element={<UsersPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
