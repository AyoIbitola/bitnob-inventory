import type { Role } from "@/types";

export interface NavItem {
  label: string;
  icon: string;
  to: string;
  section: "main" | "admin";
  /** Only render for this role. Omit = everyone. */
  role?: Role;
}

/**
 * Single source of truth for navigation. The Sidebar filters by role, so the
 * Admin section simply doesn't exist for staff (req #3).
 */
export const NAV_ITEMS: NavItem[] = [
  // NOTE: there is no separate "Manage Inventory" entry. Inventory is one page
  // that adapts to the role — admins get Add/Edit/Delete on it — so a second
  // link to the same screen was pure duplication.
  { label: "Inventory", icon: "inventory_2", to: "/", section: "main" },
  { label: "Categories", icon: "category", to: "/categories", section: "main" },
  { label: "Reports", icon: "analytics", to: "/reports", section: "main" },
  { label: "Documentation", icon: "help", to: "/guide", section: "main" },
  { label: "Settings", icon: "settings", to: "/settings", section: "main" },

  { label: "Users", icon: "group", to: "/users", section: "admin", role: "admin" },
];
