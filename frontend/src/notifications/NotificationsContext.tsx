import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useSettings } from "@/settings/SettingsContext";
import { useItems } from "@/features/inventory/hooks";
import { itemDisplayName } from "@/lib/format";
import type { Item } from "@/types";

export interface AppNotification {
  id: string;
  type: "added" | "updated" | "removed";
  title: string;
  detail: string;
  at: number;
  read: boolean;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => void;
  clearAll: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const STORAGE_KEY = "bitvault.notifications";
const POLL_MS = 30_000;
const MAX_KEPT = 50;

/** Snapshot used to detect what changed between polls. */
type Snapshot = Map<string, { updatedAt: string; label: string }>;

function snapshotOf(items: Item[]): Snapshot {
  return new Map(
    items.map((i) => [
      i.id,
      { updatedAt: i.updatedAt, label: `${itemDisplayName(i)} (${i.serialNumber})` },
    ]),
  );
}

function load(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

/**
 * Change feed for inventory.
 *
 * The backend exposes no events/websocket, so we poll the catalog and diff it
 * against the previous snapshot to detect additions, edits and deletions made
 * by ANY admin — then surface them in the bell.
 *
 * ⚠️ Not truly real-time (≈30s). When the backend gains a notifications or
 * websocket endpoint, replace the polling here and the rest keeps working.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const enabled = settings.notificationsEnabled;

  const { data: items } = useItems({ refetchInterval: enabled ? POLL_MS : undefined });

  const [notifications, setNotifications] = useState<AppNotification[]>(load);
  const previous = useRef<Snapshot | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_KEPT)));
    } catch {
      /* ignore quota */
    }
  }, [notifications]);

  useEffect(() => {
    if (!items || !enabled) return;

    const next = snapshotOf(items);

    // First load establishes the baseline — never announce the initial catalog.
    if (previous.current === null) {
      previous.current = next;
      return;
    }

    const prev = previous.current;
    const fresh: AppNotification[] = [];
    const now = Date.now();

    for (const [id, meta] of next) {
      const before = prev.get(id);
      if (!before) {
        fresh.push({
          id: `${id}-added-${meta.updatedAt}`,
          type: "added",
          title: "Unit added",
          detail: meta.label,
          at: now,
          read: false,
        });
      } else if (before.updatedAt !== meta.updatedAt) {
        fresh.push({
          id: `${id}-updated-${meta.updatedAt}`,
          type: "updated",
          title: "Unit updated",
          detail: meta.label,
          at: now,
          read: false,
        });
      }
    }

    for (const [id, meta] of prev) {
      if (!next.has(id)) {
        fresh.push({
          id: `${id}-removed-${now}`,
          type: "removed",
          title: "Unit removed",
          detail: meta.label,
          at: now,
          read: false,
        });
      }
    }

    previous.current = next;

    if (fresh.length) {
      setNotifications((current) => {
        const seen = new Set(current.map((n) => n.id));
        const deduped = fresh.filter((n) => !seen.has(n.id));
        return [...deduped, ...current].slice(0, MAX_KEPT);
      });
    }
  }, [items, enabled]);

  const markAllRead = useCallback(() => {
    setNotifications((current) => current.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      markAllRead,
      clearAll,
    }),
    [notifications, markAllRead, clearAll],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within <NotificationsProvider>");
  return ctx;
}
