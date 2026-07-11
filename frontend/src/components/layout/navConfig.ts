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
  { label: "Inventory", icon: "dashboard", to: "/", section: "main" },
  { label: "Categories", icon: "category", to: "/categories", section: "main" },
  { label: "Settings", icon: "settings", to: "/settings", section: "main" },

  { label: "Manage Inventory", icon: "inventory_2", to: "/inventory", section: "admin", role: "admin" },
  { label: "Users", icon: "group", to: "/users", section: "admin", role: "admin" },
];
