import { Topbar } from "@/components/layout/Topbar";
import { useLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { useAuth } from "@/auth/AuthContext";
import { APP_NAME, CURRENCY, USE_MOCK_API } from "@/config";

/** Account + app settings. Admin-only route. Read-only for now — profile edits
 *  need backend endpoints that don't exist yet. */
export function SettingsPage() {
  const { openNav } = useLayout();
  const { user, logout } = useAuth();

  const rows: Array<[string, React.ReactNode]> = [
    ["Email", user?.email ?? "—"],
    ["Role", user ? <Badge tone={user.role === "admin" ? "info" : "neutral"}>{user.role}</Badge> : "—"],
    ["Display currency", CURRENCY],
    ["Data source", USE_MOCK_API ? "Mock (offline)" : "Live backend"],
    ["Version", `${APP_NAME} v0.1`],
  ];

  return (
    <>
      <Topbar title="Settings" onOpenNav={openNav} />
      <main className="space-y-lg p-lg">
        <section className="max-w-xl rounded-lg border border-outline-variant bg-surface-container-lowest">
          <div className="border-b border-outline-variant px-lg py-md">
            <h3 className="text-headline-sm text-on-surface">Account</h3>
          </div>
          <dl className="divide-y divide-outline-variant/40">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between px-lg py-md">
                <dt className="text-label-caps uppercase text-on-surface-variant">{label}</dt>
                <dd className="text-body-md text-on-surface">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div>
          <Button variant="danger-outline" icon="logout" onClick={logout}>
            Log out
          </Button>
        </div>
      </main>
    </>
  );
}
