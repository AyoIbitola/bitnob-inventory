import { Link, NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";
import { useAuth } from "@/auth/AuthContext";
import { APP_NAME } from "@/config";
import { NAV_ITEMS, type NavItem } from "./navConfig";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Fixed dark navigation rail — the Admin Panel only (this component is
 * mounted exclusively under the admin-gated /admin/* routes now; every other
 * page uses PlainLayout with no sidebar at all). Collapses to an off-canvas
 * drawer below lg.
 */
export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-white/5 bg-inverse-surface px-3 py-lg transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Primary navigation"
      >
        {/* Brand — links back to Home, the way out of the Admin Panel. */}
        <Link to="/" className="mb-xl flex items-center gap-sm px-2" onClick={onClose}>
          <div className="leading-tight">
            <div className="text-body-md font-bold text-white">{APP_NAME}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              Admin Panel
            </div>
          </div>
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} item={item} onNavigate={onClose} />
          ))}
        </nav>

        {/* User footer */}
        {user && (
          <div className="mt-md flex items-center gap-sm rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/5">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-container text-label-caps font-bold text-on-primary">
              {user.initials ?? user.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-body-sm font-semibold text-white">{user.email}</div>
              <div className="text-[11px] capitalize text-white/40">{user.role}</div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function SidebarLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === "/admin"}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group relative flex h-11 items-center gap-md rounded-lg px-3 transition-all duration-150",
          isActive
            ? "bg-white/10 font-semibold text-white ring-1 ring-white/10"
            : "font-medium text-white/60 hover:bg-white/5 hover:text-white",
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-primary-fixed-dim" />
          )}
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ fontVariationSettings: isActive ? "'FILL' 1, 'wght' 500" : "'FILL' 0" }}
          >
            {item.icon}
          </span>
          <span className="text-body-sm">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}
