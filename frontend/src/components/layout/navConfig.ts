export interface NavItem {
  label: string;
  icon: string;
  to: string;
  section: "main";
}

/**
 * Sidebar nav for the Admin Panel ONLY (/admin/*, AppLayout) — the sidebar no
 * longer exists anywhere else in the app. Categories/Reports/Guide/Settings
 * are reachable by everyone (admins included) via the account menu instead;
 * listing them here too would just be a duplicate path to the same page.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Inventory", icon: "inventory_2", to: "/admin", section: "main" },
  { label: "Users", icon: "group", to: "/admin/users", section: "main" },
];
