import type { Role } from "@/types";

export interface NavItem {
  label: string;
  icon: string;
  to: string;
  /** Restrict visibility to a role. Omit = visible to everyone signed in. */
  role?: Role;
  /** Grouping header this item sits under. */
  section: "main" | "admin";
}

/**
 * Single source of truth for sidebar navigation. Role-gating is applied at
 * render time via useAuth, so admin items never render for staff. Every item
 * here points to a real, built route — no dead/locked links.
 *
 * Note: there is no separate "Manage Inventory" — the Dashboard IS the
 * inventory workspace, and it's role-adaptive (admins get Add/Edit/Delete).
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: "dashboard", to: "/", section: "main" },
  { label: "Categories", icon: "category", to: "/categories", section: "main" },
  { label: "Reports", icon: "analytics", to: "/reports", section: "main" },
  { label: "Users", icon: "group", to: "/users", section: "admin", role: "admin" },
  { label: "Settings", icon: "settings", to: "/settings", section: "admin", role: "admin" },
];
