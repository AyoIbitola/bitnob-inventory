import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DEFAULT_PAGE_SIZE } from "@/config";

/**
 * PERSONAL display preferences, stored per-browser in localStorage — page
 * size and notifications only. The low stock threshold used to live here too,
 * but that's an org-wide policy decision (only an admin should set it, and
 * every user needs to see the SAME number), not a per-browser preference —
 * it's now server-stored via GET/PATCH /settings (see features/settings/hooks.ts,
 * useLowStockThreshold). Keeping it here would mean each browser silently
 * defaulted to its own stale copy instead of the admin's real value.
 */
export interface Settings {
  /** Rows per page in tables. */
  pageSize: number;
  /** Poll the API and surface changes in the notification bell. */
  notificationsEnabled: boolean;
}

// Currency is NOT a setting — everything is in Naira. It lives as the single
// CURRENCY constant in config and is the default for formatPrice().
const DEFAULTS: Settings = {
  pageSize: DEFAULT_PAGE_SIZE,
  notificationsEnabled: true,
};

const STORAGE_KEY = "bitvault.settings";

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    // Merge so new keys added later still get defaults.
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULTS;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* quota/private mode — settings just won't persist */
    }
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULTS), []);

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within <SettingsProvider>");
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export { DEFAULTS as DEFAULT_SETTINGS };
