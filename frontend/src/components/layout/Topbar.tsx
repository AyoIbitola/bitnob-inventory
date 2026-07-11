import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useNotifications } from "@/notifications/NotificationsContext";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/Badge";
import { cn } from "@/lib/cn";

interface TopbarProps {
  title: string;
  children?: ReactNode;
  onOpenNav: () => void;
}

/** Sticky top bar: page title, page-supplied controls, notifications, account. */
export function Topbar({ title, children, onOpenNav }: TopbarProps) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();
  const [menu, setMenu] = useState<"none" | "account" | "bell">("none");
  const initials = user?.initials ?? user?.name.slice(0, 2).toUpperCase() ?? "?";

  const close = () => setMenu("none");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-sm border-b border-outline-variant bg-surface px-md md:px-lg">
      <div className="flex min-w-0 flex-1 items-center gap-md">
        <button
          type="button"
          onClick={onOpenNav}
          className="flex-shrink-0 text-on-surface-variant hover:text-primary lg:hidden"
          aria-label="Open navigation"
        >
          <Icon name="menu" />
        </button>
        <h2 className="truncate text-display-md font-bold text-primary">{title}</h2>
        {children}
      </div>

      <div className="flex flex-shrink-0 items-center gap-xs">
        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenu(menu === "bell" ? "none" : "bell")}
            aria-label={
              unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
            }
            aria-haspopup="menu"
            className="relative rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-variant/20 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          >
            <Icon name="notifications" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-on-error">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {menu === "bell" && (
            <>
              <div className="fixed inset-0 z-10" onClick={close} aria-hidden />
              <div className="absolute right-0 z-20 mt-sm flex max-h-[70vh] w-[min(20rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-overlay">
                <div className="flex items-center justify-between border-b border-outline-variant px-md py-sm">
                  <span className="text-body-sm font-semibold text-on-surface">Notifications</span>
                  {notifications.length > 0 && (
                    <div className="flex gap-sm">
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="text-body-sm text-primary hover:underline"
                      >
                        Mark read
                      </button>
                      <button
                        type="button"
                        onClick={clearAll}
                        className="text-body-sm text-on-surface-variant hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <p className="px-md py-lg text-center text-body-sm text-on-surface-variant">
                    No changes yet. You&apos;ll be notified when inventory changes.
                  </p>
                ) : (
                  <ul className="divide-y divide-outline-variant overflow-y-auto">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className={cn(
                          "flex gap-sm px-md py-sm",
                          !n.read && "bg-primary-fixed/30",
                        )}
                      >
                        <Icon
                          name={
                            n.type === "added"
                              ? "add_circle"
                              : n.type === "removed"
                                ? "cancel"
                                : "edit"
                          }
                          className={cn(
                            "mt-0.5 text-[18px]",
                            n.type === "added" && "text-status-success-fg",
                            n.type === "removed" && "text-error",
                            n.type === "updated" && "text-primary",
                          )}
                        />
                        <div className="min-w-0">
                          <p className="text-body-sm font-semibold text-on-surface">{n.title}</p>
                          <p className="truncate text-body-sm text-on-surface-variant">
                            {n.detail}
                          </p>
                          <p className="text-[11px] text-on-surface-variant">
                            {new Date(n.at).toLocaleTimeString()}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        {/* Account */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenu(menu === "account" ? "none" : "account")}
            aria-haspopup="menu"
            aria-expanded={menu === "account" ? "true" : "false"}
            className="flex items-center gap-xs rounded-lg p-1 transition-colors hover:bg-surface-variant/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container text-label-caps font-bold text-on-secondary-container">
              {initials}
            </span>
            <Icon name="expand_more" className="hidden text-[20px] text-on-surface-variant sm:block" />
          </button>

          {menu === "account" && (
            <>
              <div className="fixed inset-0 z-10" onClick={close} aria-hidden />
              <div
                role="menu"
                className="absolute right-0 z-20 mt-sm w-56 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-overlay"
              >
                <div className="border-b border-outline-variant px-md py-sm">
                  <p className="truncate text-body-sm font-semibold text-on-surface">
                    {user?.email}
                  </p>
                  {user && (
                    <Badge tone={user.role === "admin" ? "info" : "neutral"} className="mt-xs">
                      {user.role}
                    </Badge>
                  )}
                </div>
                <Link
                  to="/settings"
                  role="menuitem"
                  onClick={close}
                  className="flex w-full items-center gap-sm px-md py-sm text-left text-body-md text-on-surface transition-colors hover:bg-surface-container-low"
                >
                  <Icon name="settings" className="text-[20px] text-on-surface-variant" />
                  Settings
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close();
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
