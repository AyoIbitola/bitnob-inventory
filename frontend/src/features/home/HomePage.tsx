import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useNotifications } from "@/notifications/NotificationsContext";
import { useTheme } from "@/theme/ThemeContext";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ApiError } from "@/api";
import { APP_NAME } from "@/config";
import { formatPrice, itemDisplayName } from "@/lib/format";
import { useAiSearch } from "@/features/inventory/hooks";
import { cn } from "@/lib/cn";

/**
 * The front door — everyone lands here first, admin or staff, logged in or
 * not. A search bar, not a table: the Google-homepage pattern the redesign
 * asked for, built on the existing AI search (POST /search) rather than a
 * new feature. Theme-aware like every other page (light/dark toggle in the
 * header) — it used to be permanently dark, which fought the app-wide toggle
 * once that existed.
 */
export function HomePage() {
  const navigate = useNavigate();
  const { user, hasRole, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const search = useAiSearch();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) search.mutate(q);
  }

  const result = search.data;
  const initials = user?.initials ?? user?.name.slice(0, 2).toUpperCase() ?? "?";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-between px-md md:px-lg">
        <span className="text-body-md font-bold text-on-surface-variant">{APP_NAME}</span>

        <div className="flex items-center gap-xs">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-variant/20 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          >
            <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen ? "true" : "false"}
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-secondary-container text-label-caps font-bold text-on-secondary-container hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
            >
              {user ? initials : <Icon name="person" className="text-[18px]" />}
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-on-error">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden
                />
                <div
                  role="menu"
                  className="absolute right-0 z-20 mt-sm w-56 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface shadow-overlay"
                >
                  <div className="border-b border-outline-variant px-md py-sm">
                    {user ? (
                      <>
                        <p className="truncate text-body-sm font-semibold text-on-surface">
                          {user.email}
                        </p>
                        <Badge tone={user.role === "admin" ? "info" : "neutral"} className="mt-xs">
                          {user.role}
                        </Badge>
                      </>
                    ) : (
                      <p className="text-body-sm text-on-surface-variant">Not signed in</p>
                    )}
                  </div>
                  <Link
                    to="/reports"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-sm px-md py-sm text-body-md hover:bg-surface-container-low"
                  >
                    <Icon name="analytics" className="text-[20px] text-on-surface-variant" />
                    Reports
                  </Link>
                  <Link
                    to="/guide"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-sm px-md py-sm text-body-md hover:bg-surface-container-low"
                  >
                    <Icon name="help" className="text-[20px] text-on-surface-variant" />
                    Documentation
                  </Link>
                  <Link
                    to="/settings"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-sm px-md py-sm text-body-md hover:bg-surface-container-low"
                  >
                    <Icon name="settings" className="text-[20px] text-on-surface-variant" />
                    Settings
                  </Link>
                  {hasRole("admin") && (
                    <Link
                      to="/admin"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-sm border-t border-outline-variant px-md py-sm text-body-md hover:bg-surface-container-low"
                    >
                      <Icon
                        name="admin_panel_settings"
                        className="text-[20px] text-on-surface-variant"
                      />
                      Admin Panel
                    </Link>
                  )}
                  {user ? (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-sm px-md py-sm text-left text-body-md hover:bg-surface-container-low"
                    >
                      <Icon name="logout" className="text-[20px] text-on-surface-variant" />
                      Log out
                    </button>
                  ) : (
                    <Link
                      to="/login"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-sm border-t border-outline-variant px-md py-sm text-body-md hover:bg-surface-container-low"
                    >
                      <Icon name="login" className="text-[20px] text-on-surface-variant" />
                      Log in
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* The search itself */}
      <main className="flex flex-1 flex-col items-center px-md py-xl md:justify-center md:py-0">
        <div className="w-full max-w-[600px] text-center">
          <h1 className="text-display-lg font-extrabold tracking-tight text-on-surface md:text-[40px]">
            {APP_NAME}
          </h1>
          <p className="mt-xs text-body-sm text-on-surface-variant">
            Search your stock, ask a question, or browse everything on hand.
          </p>

          <form onSubmit={handleSubmit} className="mt-xl">
            <div className="relative">
              <Icon
                name="search"
                className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[22px] text-on-surface-variant"
              />
              {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. what's running low on stock?"
                aria-label="Search inventory"
                className="h-14 w-full rounded-full border-0 bg-surface-container-lowest pl-14 pr-md text-body-md text-on-surface shadow-overlay focus-ring"
              />
            </div>
            <div className="mt-lg flex flex-wrap items-center justify-center gap-sm">
              <Button type="submit" loading={search.isPending} disabled={!query.trim()}>
                Search
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate("/categories")}>
                View Categories
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate("/products")}>
                View Full Inventory
              </Button>
            </div>
          </form>

          {/* Results render inline, right here — no page navigation, closer
              to how Google itself behaves than sending you somewhere else. */}
          <div className="mt-xl text-left">
            {search.isError && (
              <div className="flex items-start gap-sm rounded-lg border border-error-container bg-error-container/40 px-md py-sm text-body-sm text-on-error-container">
                <Icon name="error" className="text-[20px]" />
                <span>
                  {search.error instanceof ApiError && search.error.status !== 500
                    ? search.error.message
                    : "AI search is temporarily unavailable. Try Categories instead."}
                </span>
              </div>
            )}

            {result && (
              <div className="space-y-md">
                <p className="rounded-lg bg-surface-container-low px-md py-sm text-body-md text-on-surface">
                  {result.answer}
                </p>

                {result.items.length > 0 && (
                  <ul className="divide-y divide-outline-variant overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
                    {result.items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            const params = new URLSearchParams();
                            if (item.category) params.set("category", item.category);
                            params.set("unit", item.id);
                            navigate(`/products?${params.toString()}`);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between gap-md px-md py-sm text-left transition-colors hover:bg-surface-container-low",
                            "focus:outline-none focus-visible:bg-surface-container-low",
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-on-surface">
                              {itemDisplayName(item)}
                            </span>
                            <span className="text-body-sm text-on-surface-variant">
                              {item.serialNumber} · {formatPrice(item.price)}
                            </span>
                          </span>
                          {item.category && <Badge>{item.category}</Badge>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
