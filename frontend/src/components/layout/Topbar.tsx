import { useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/auth/AuthContext";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/Badge";

interface TopbarProps {
  title: string;
  /** Optional search input / filters injected by the page. */
  children?: ReactNode;
  onOpenNav: () => void;
}

/** Sticky top bar: page title, page-supplied controls, and the account menu. */
export function Topbar({ title, children, onOpenNav }: TopbarProps) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = user?.initials ?? user?.name.slice(0, 2).toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-md border-b border-outline-variant bg-surface px-lg">
      <div className="flex min-w-0 items-center gap-md">
        <button
          type="button"
          onClick={onOpenNav}
          className="text-on-surface-variant hover:text-primary lg:hidden"
          aria-label="Open navigation"
        >
          <Icon name="menu" />
        </button>
        <h2 className="truncate text-display-md font-bold text-primary">{title}</h2>
        {children}
      </div>

      <div className="flex items-center gap-sm">
        <button
          type="button"
          className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-variant/20 hover:text-primary"
          aria-label="Notifications"
        >
          <Icon name="notifications" />
        </button>

        {/* Account menu — clicking the avatar opens a menu; logout is an
            explicit choice inside it (no accidental sign-out). */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen ? "true" : "false"}
            className="flex items-center gap-xs rounded-lg p-1 transition-colors hover:bg-surface-variant/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container text-label-caps font-bold text-on-secondary-container">
              {initials}
            </span>
            <Icon name="expand_more" className="text-[20px] text-on-surface-variant" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
              <div
                role="menu"
                className="absolute right-0 z-20 mt-sm w-56 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-overlay"
              >
                <div className="border-b border-outline-variant px-md py-sm">
                  <p className="truncate text-body-sm font-semibold text-on-surface">{user?.email}</p>
                  {user && (
                    <Badge tone={user.role === "admin" ? "info" : "neutral"} className="mt-xs">
                      {user.role}
                    </Badge>
                  )}
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-sm px-md py-sm text-left text-body-md text-on-surface transition-colors hover:bg-surface-container-low"
                >
                  <Icon name="logout" className="text-[20px] text-on-surface-variant" />
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
