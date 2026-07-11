import { useState } from "react";
import type { ReactNode } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { Icon } from "@/components/Icon";
import { InputField, SelectField } from "@/components/FormField";
import { useAuth } from "@/auth/AuthContext";
import { useSettings } from "@/settings/SettingsContext";
import { APP_NAME } from "@/config";
import { formatDate } from "@/lib/format";

const CURRENCIES = ["NGN", "USD", "EUR", "GBP", "GHS", "KES", "ZAR"];
const PAGE_SIZES = [10, 25, 50, 100];

/**
 * Settings. Preferences here are real — they drive stock thresholds, currency
 * formatting, table paging and the notification poller.
 *
 * Profile and password are read-only: the backend exposes no endpoints to
 * update a user's email or change a password (flagged in DESIGN-NOTES).
 */
export function SettingsPage() {
  const { openNav } = useLayout();
  const { user } = useAuth();
  const { settings, update, reset } = useSettings();
  const [saved, setSaved] = useState(false);

  function touch() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  return (
    <>
      <Topbar title="Settings" onOpenNav={openNav}>
        {saved && (
          <span className="flex items-center gap-xs text-body-sm text-status-success-fg">
            <Icon name="check_circle" className="text-[18px]" /> Saved
          </span>
        )}
      </Topbar>

      <main className="mx-auto w-full max-w-3xl space-y-lg p-md md:p-lg">
        <Section
          title="Profile"
          description="Your account details, as held by the backend."
          icon="account_circle"
        >
          <div className="flex items-center gap-md">
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-secondary-container text-headline-sm font-bold text-on-secondary-container">
              {user?.initials ?? "?"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-body-md font-semibold text-on-surface">{user?.email}</p>
              <div className="mt-xs flex flex-wrap items-center gap-sm">
                <Badge tone={user?.role === "admin" ? "info" : "neutral"}>{user?.role}</Badge>
                {user?.createdAt && (
                  <span className="text-body-sm text-on-surface-variant">
                    Joined {formatDate(user.createdAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Notice>
            Email and display name can&apos;t be changed yet — the API has no endpoint for it.
          </Notice>
        </Section>

        <Section
          title="Inventory"
          description="How stock levels and prices are interpreted."
          icon="inventory_2"
        >
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <InputField
              label="Low stock threshold (units)"
              type="number"
              min={0}
              value={String(settings.lowStockThreshold)}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isInteger(n) && n >= 0) {
                  update({ lowStockThreshold: n });
                  touch();
                }
              }}
            />
            <SelectField
              label="Display currency"
              value={settings.currency}
              onChange={(e) => {
                update({ currency: e.target.value });
                touch();
              }}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectField>
          </div>
          <p className="text-body-sm text-on-surface-variant">
            A product with <strong>{settings.lowStockThreshold} units or fewer</strong> is marked
            Low Stock; zero units is Out of Stock.
          </p>
          <Notice>
            The backend stores prices as plain numbers with no currency, so this is a display
            setting only — it never changes stored values.
          </Notice>
        </Section>

        <Section title="Display" description="How lists are paged." icon="table_rows">
          <SelectField
            label="Rows per page"
            wrapperClassName="sm:w-48"
            value={String(settings.pageSize)}
            onChange={(e) => {
              update({ pageSize: Number(e.target.value) });
              touch();
            }}
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </SelectField>
        </Section>

        <Section
          title="Notifications"
          description="Get alerted when inventory changes."
          icon="notifications"
        >
          <Toggle
            checked={settings.notificationsEnabled}
            onChange={(v) => {
              update({ notificationsEnabled: v });
              touch();
            }}
            label="Inventory change alerts"
            hint="Notifies you when any admin adds, edits or deletes a unit."
          />
          <Notice>
            The API has no live events endpoint, so changes are detected by polling every 30
            seconds — alerts can lag slightly behind.
          </Notice>
        </Section>

        <Section title="Security" description="Password and session." icon="lock">
          <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-body-md font-semibold text-on-surface">Password</p>
              <p className="text-body-sm text-on-surface-variant">
                Ask an administrator to reset it for you.
              </p>
            </div>
            <Button variant="secondary" disabled title="No password-change endpoint on the API">
              Change password
            </Button>
          </div>
          <Notice>
            Password changes and resets need a backend endpoint that doesn&apos;t exist yet.
          </Notice>
        </Section>

        <Section title="About" description="Application information." icon="info">
          <dl className="grid grid-cols-2 gap-sm text-body-sm">
            <dt className="text-on-surface-variant">Application</dt>
            <dd className="text-on-surface">{APP_NAME}</dd>
            <dt className="text-on-surface-variant">Version</dt>
            <dd className="text-on-surface">0.1.0</dd>
          </dl>
          <div className="pt-sm">
            <Button
              variant="secondary"
              icon="restart_alt"
              onClick={() => {
                reset();
                touch();
              }}
            >
              Reset preferences to defaults
            </Button>
          </div>
        </Section>
      </main>
    </>
  );
}

function Section({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-outline-variant bg-surface-container-lowest">
      <header className="flex items-start gap-md border-b border-outline-variant px-md py-md md:px-lg">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface-variant text-primary">
          <Icon name={icon} className="text-[20px]" />
        </span>
        <div>
          <h2 className="text-body-md font-bold text-on-surface">{title}</h2>
          <p className="text-body-sm text-on-surface-variant">{description}</p>
        </div>
      </header>
      <div className="space-y-md px-md py-md md:px-lg">{children}</div>
    </section>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-sm rounded-lg bg-surface-container-low px-md py-sm text-body-sm text-on-surface-variant">
      <Icon name="info" className="mt-0.5 flex-shrink-0 text-[18px]" />
      <span>{children}</span>
    </p>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-md">
      <span>
        <span className="block text-body-md font-semibold text-on-surface">{label}</span>
        <span className="block text-body-sm text-on-surface-variant">{hint}</span>
      </span>
      <span className="relative flex-shrink-0">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="block h-6 w-11 rounded-full bg-surface-variant transition-colors peer-checked:bg-primary-container peer-focus-visible:ring-2 peer-focus-visible:ring-primary-container peer-focus-visible:ring-offset-2" />
        <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
