import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { Icon } from "@/components/Icon";
import { InputField, SelectField } from "@/components/FormField";
import { PasswordField } from "@/components/PasswordField";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/auth/AuthContext";
import { useSettings } from "@/settings/SettingsContext";
import { useLowStockThreshold, useUpdateLowStockThreshold } from "./hooks";
import { ApiError, authService } from "@/api";
import { APP_NAME, CURRENCY } from "@/config";
import { formatDate } from "@/lib/format";

const PAGE_SIZES = [10, 25, 50, 100];

/** A date-stamped build reads as shipped software; "v0.1" reads as unfinished. */
const BUILD_LABEL = `Build ${new Date().toISOString().slice(0, 10)}`;

/**
 * Settings. Preferences here are real — they drive stock thresholds, table
 * paging and the notification poller. Password change hits the backend.
 */
export function SettingsPage() {
  const { openNav } = useLayout();
  const { user } = useAuth();
  const { settings, update, reset } = useSettings();
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);

  const { threshold: lowStockThreshold } = useLowStockThreshold();
  const updateThreshold = useUpdateLowStockThreshold();
  // Local draft so keystrokes don't fire a PATCH each time — only committed
  // on blur. Synced from the server value once it loads.
  const [thresholdDraft, setThresholdDraft] = useState(String(lowStockThreshold));
  useEffect(() => {
    setThresholdDraft(String(lowStockThreshold));
  }, [lowStockThreshold]);

  function touch() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  async function commitThreshold() {
    const n = Number(thresholdDraft);
    if (!Number.isInteger(n) || n < 0) {
      setThresholdDraft(String(lowStockThreshold));
      return;
    }
    if (n === lowStockThreshold) return;
    try {
      await updateThreshold.mutateAsync(n);
      touch();
    } catch (err) {
      setThresholdDraft(String(lowStockThreshold));
      toast(err instanceof ApiError ? err.message : "Couldn't update the threshold.", "error");
    }
  }

  return (
    <>
      <Topbar title="Settings" onOpenNav={openNav}>
        {saved && (
          <span className="hidden items-center gap-xs text-body-sm text-status-success-fg sm:flex">
            <Icon name="check_circle" className="text-[18px]" /> Saved
          </span>
        )}
      </Topbar>

      <main className="mx-auto w-full max-w-3xl space-y-lg p-md md:p-lg">
        <Section title="Profile" description="Your account details." icon="account_circle">
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
        </Section>

        <Section
          title="Inventory"
          description="How stock levels are interpreted."
          icon="inventory_2"
        >
          {user?.role === "admin" ? (
            <InputField
              label="Low stock threshold (units)"
              type="number"
              min={0}
              wrapperClassName="sm:w-64"
              value={thresholdDraft}
              disabled={updateThreshold.isPending}
              onChange={(e) => setThresholdDraft(e.target.value)}
              onBlur={commitThreshold}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
          ) : (
            // Staff can see the threshold that's shaping the Low Stock badges
            // they rely on, just not change it — this is an inventory policy
            // decision, not a personal display preference. Enforced
            // server-side too (PATCH /settings is admin-only), this is just
            // the UI reflecting that rather than offering a control that 403s.
            <div className="sm:w-64">
              <span className="text-label-caps uppercase tracking-wider text-on-surface-variant">
                Low stock threshold (units)
              </span>
              <p className="mt-1 text-body-md text-on-surface">
                {lowStockThreshold}{" "}
                <span className="text-body-sm text-on-surface-variant">— set by an admin</span>
              </p>
            </div>
          )}
          <p className="text-body-sm text-on-surface-variant">
            A product with <strong>{lowStockThreshold} units or fewer</strong> is marked Low Stock;
            zero units is Out of Stock. Prices are in {CURRENCY}. This threshold applies to every
            user, org-wide.
          </p>
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
        </Section>

        <Section title="Security" description="Change your password." icon="lock">
          <ChangePasswordForm onDone={() => toast("Password changed.")} />
        </Section>

        <Section title="About" description="Application information." icon="info">
          {/* Build metadata is admin-only: showing a version/data-source to every
              staff member signals pre-production and mildly aids an attacker. */}
          {user?.role === "admin" && (
            <dl className="grid grid-cols-2 gap-sm text-body-sm">
              <dt className="text-on-surface-variant">Application</dt>
              <dd className="text-on-surface">{APP_NAME}</dd>
              <dt className="text-on-surface-variant">Build</dt>
              <dd className="text-on-surface">{BUILD_LABEL}</dd>
            </dl>
          )}
          <div className="pt-sm">
            <Button
              variant="secondary"
              icon="restart_alt"
              onClick={() => {
                reset();
                touch();
              }}
            >
              Reset preferences
            </Button>
          </div>
        </Section>
      </main>
    </>
  );
}

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (next.length < 8) return setError("New password must be at least 8 characters.");
    if (next !== confirm) return setError("New passwords don't match.");

    setBusy(true);
    try {
      await authService.changePassword({ currentPassword: current, newPassword: next });
      setCurrent("");
      setNext("");
      setConfirm("");
      onDone();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't change your password. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-md" onSubmit={handleSubmit} noValidate>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-error-container bg-error-container/50 px-md py-sm text-body-sm text-on-error-container"
        >
          {error}
        </p>
      )}
      <PasswordField
        label="Current password"
        autoComplete="current-password"
        required
        wrapperClassName="sm:w-80"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
      />
      <PasswordField
        label="New password"
        autoComplete="new-password"
        required
        wrapperClassName="sm:w-80"
        value={next}
        onChange={(e) => setNext(e.target.value)}
      />
      <PasswordField
        label="Confirm new password"
        autoComplete="new-password"
        required
        wrapperClassName="sm:w-80"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      <Button type="submit" loading={busy} disabled={!current || !next}>
        Change password
      </Button>
    </form>
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
    <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
      <header className="flex items-start gap-md border-b border-outline-variant px-md py-md md:px-lg">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface-variant text-primary">
          <Icon name={icon} className="text-[20px]" />
        </span>
        <div className="min-w-0">
          <h2 className="text-body-md font-bold text-on-surface">{title}</h2>
          <p className="text-body-sm text-on-surface-variant">{description}</p>
        </div>
      </header>
      <div className="space-y-md px-md py-md md:px-lg">{children}</div>
    </section>
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
      <span className="min-w-0">
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
