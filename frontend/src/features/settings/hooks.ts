import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appSettingsService } from "@/api";

const appSettingsKey = ["app-settings"] as const;

/** Fallback while the query is loading/erroring — matches the backend's own
 * seeded default, so stock-status badges don't flash wrong before this loads. */
const FALLBACK_THRESHOLD = 10;

/**
 * The org-wide low stock threshold. Unlike the rest of SettingsContext (page
 * size, notifications), this is server-stored and admin-only to change — a
 * policy decision, not a personal display preference.
 */
export function useLowStockThreshold() {
  const query = useQuery({ queryKey: appSettingsKey, queryFn: () => appSettingsService.get() });
  return { threshold: query.data?.lowStockThreshold ?? FALLBACK_THRESHOLD, query };
}

export function useUpdateLowStockThreshold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (value: number) => appSettingsService.update(value),
    onSuccess: () => qc.invalidateQueries({ queryKey: appSettingsKey }),
  });
}
