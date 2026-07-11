import { useState } from "react";
import { Outlet, useOutletContext } from "react-router-dom";
import { Sidebar } from "./Sidebar";

interface LayoutContext {
  /** Opens the mobile nav drawer; pages wire this to their Topbar. */
  openNav: () => void;
}

/**
 * Authenticated app frame: fixed sidebar + a scrollable content column. Pages
 * render their own <Topbar> (so page-specific search/filters stay local) and
 * pull `openNav` from the outlet context for the mobile menu button.
 */
export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-h-screen flex-col lg:ml-64">
        <Outlet context={{ openNav: () => setNavOpen(true) } satisfies LayoutContext} />
      </div>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLayout(): LayoutContext {
  return useOutletContext<LayoutContext>();
}
