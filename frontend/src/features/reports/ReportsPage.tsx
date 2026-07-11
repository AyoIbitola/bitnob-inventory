import { useMemo } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/StatCard";
import { Spinner } from "@/components/Spinner";
import { formatNumber, formatPrice } from "@/lib/format";
import type { StockStatus } from "@/types";
import { useAllItems, useInventorySummary } from "@/features/inventory/hooks";

const STATUS_META: Record<StockStatus, { label: string; bar: string }> = {
  in_stock: { label: "In Stock", bar: "bg-status-success-fg" },
  low_stock: { label: "Low Stock", bar: "bg-status-warning-fg" },
  out_of_stock: { label: "Out of Stock", bar: "bg-status-danger-fg" },
};

/**
 * Reports overview — derived analytics (no backend reports endpoint yet). Stock
 * health breakdown + value by category, computed from the catalog. Read-only.
 */
export function ReportsPage() {
  const { openNav } = useLayout();
  const summary = useInventorySummary();
  const { data: items, isLoading } = useAllItems();

  const { statusCounts, byCategory, total } = useMemo(() => {
    const counts: Record<StockStatus, number> = { in_stock: 0, low_stock: 0, out_of_stock: 0 };
    const cat = new Map<string, number>();
    for (const item of items ?? []) {
      counts[item.status] += 1;
      const name = item.category ?? "Uncategorized";
      cat.set(name, (cat.get(name) ?? 0) + (item.price ?? 0) * item.quantity);
    }
    const byCategory = [...cat.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    return { statusCounts: counts, byCategory, total: items?.length ?? 0 };
  }, [items]);

  const maxCatValue = Math.max(1, ...byCategory.map((c) => c.value));

  return (
    <>
      <Topbar title="Reports" onOpenNav={openNav} />
      <main className="space-y-lg p-lg">
        <section className="grid grid-cols-2 gap-gutter md:grid-cols-4">
          <StatCard
            label="Total Items"
            value={summary.data ? formatNumber(summary.data.totalItems) : "—"}
            loading={summary.isLoading}
            icon="inventory_2"
          />
          <StatCard
            label="Total Value"
            value={summary.data ? formatPrice(summary.data.totalValue, summary.data.currency) : "—"}
            loading={summary.isLoading}
            tone="primary"
          />
          <StatCard
            label="Low Stock"
            value={summary.data?.lowStock ?? "—"}
            loading={summary.isLoading}
            hint="Reorder soon"
          />
          <StatCard
            label="Out of Stock"
            value={summary.data?.outOfStock ?? "—"}
            loading={summary.isLoading}
            tone="error"
          />
        </section>

        <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
          {/* Stock health */}
          <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
            <h3 className="mb-md text-headline-sm text-on-surface">Stock Health</h3>
            {isLoading ? (
              <Spinner className="text-primary" />
            ) : (
              <div className="space-y-md">
                {(Object.keys(STATUS_META) as StockStatus[]).map((s) => {
                  const count = statusCounts[s];
                  const pct = total ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={s}>
                      <div className="mb-xs flex justify-between text-body-sm">
                        <span className="text-on-surface">{STATUS_META[s].label}</span>
                        <span className="text-on-surface-variant">
                          {count} · {pct}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-variant">
                        <div
                          className={`h-full rounded-full ${STATUS_META[s].bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Value by category */}
          <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
            <h3 className="mb-md text-headline-sm text-on-surface">Top Categories by Value</h3>
            {isLoading ? (
              <Spinner className="text-primary" />
            ) : byCategory.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">No data yet.</p>
            ) : (
              <div className="space-y-md">
                {byCategory.map((c) => (
                  <div key={c.name}>
                    <div className="mb-xs flex justify-between text-body-sm">
                      <span className="text-on-surface">{c.name}</span>
                      <span className="text-on-surface-variant">{formatPrice(c.value)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-variant">
                      <div
                        className="h-full rounded-full bg-primary-container"
                        style={{ width: `${Math.round((c.value / maxCatValue) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
