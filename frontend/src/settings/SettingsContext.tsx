import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CURRENCY, DEFAULT_PAGE_SIZE } from "@/config";

/**
 * App preferences. The backend has no settings endpoint, so these are stored
 * per-browser in localStorage. They drive real behaviour (stock thresholds,
 * currency, page size, notifications) — not decoration.
 *
 * When the backend adds a user-preferences endpoint, swap the persistence here
 * and every consumer keeps working.
 */
export interface Settings {
  /** Units at or below this count = "Low Stock". 0 units = "Out of Stock". */
  lowStockThreshold: number;
  /** ISO 4217 display currency (backend stores a bare number). */
  currency: string;
  /** Rows per page in tables. */
  pageSize: number;
  /** Poll the API and surface changes in the notification bell. */
  notificationsEnabled: boolean;
}

const DEFAULTS: Settings = {
  lowStockThreshold: 10,
  currency: CURRENCY,
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
