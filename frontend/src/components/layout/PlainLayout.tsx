import { Outlet } from "react-router-dom";
import type { LayoutContext } from "./AppLayout";

/**
 * The frame for everyone's day-to-day screens (Home, Categories, Reports,
 * Settings, Guide) — no sidebar. Per the redesign: staff never see the
 * sidebar at all; it's reserved for the Admin Panel (/admin/*, AppLayout).
 * Just a scrollable column — each page renders its own <Topbar>, same as
 * under AppLayout, so page chrome doesn't fork into two implementations.
 */
export function PlainLayout() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <div className="flex min-h-screen min-w-0 flex-col">
        <Outlet context={{} satisfies LayoutContext} />
      </div>
    </div>
  );
}
