import { useMemo, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { StatCard } from "@/components/StatCard";
import { SelectField } from "@/components/FormField";
import { useToast } from "@/components/Toast";
import { useLowStockThreshold } from "@/features/settings/hooks";
import { formatNumber, formatPrice, itemDisplayName } from "@/lib/format";
import { useItems } from "@/features/inventory/hooks";
import { groupItems } from "@/features/inventory/grouping";
import type { StockStatus } from "@/types";

type RangeKey = "all" | "30" | "90";

const RANGES: Array<{ value: RangeKey; label: string }> = [
  { value: "all", label: "All time" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

const STATUS_META: Record<StockStatus, { label: string; className: string }> = {
  in_stock: { label: "In Stock", className: "bg-status-success-fg" },
  low_stock: { label: "Low Stock", className: "bg-status-warning-fg" },
  out_of_stock: { label: "Out of Stock", className: "bg-error" },
};

/** Top N categories shown as bars; the rest stay in the Categories page. */
const TOP_N = 5;

/**
 * Reports. Unlike the dashboard, this answers "how is inventory distributed and
 * what's it worth" — and lets you take the answer away (CSV export) or narrow it
 * to a period (units added in the last N days).
 */
export function ReportsPage() {
  const { openNav } = useLayout();
  const { threshold: lowStockThreshold } = useLowStockThreshold();
  const { toast } = useToast();
  const { data: items, isLoading } = useItems();

  const [range, setRange] = useState<RangeKey>("all");

  /** Range filters by when a unit entered inventory (created_at). */
  const scoped = useMemo(() => {
    if (!items) return [];
    if (range === "all") return items;
    const cutoff = Date.now() - Number(range) * 24 * 60 * 60 * 1000;
    return items.filter((i) => (i.createdAt ? new Date(i.createdAt).getTime() >= cutoff : false));
  }, [items, range]);

  const groups = useMemo(
    () => groupItems(scoped, lowStockThreshold),
    [scoped, lowStockThreshold],
  );

  const totals = useMemo(() => {
    const byStatus: Record<StockStatus, number> = { in_stock: 0, low_stock: 0, out_of_stock: 0 };
    for (const g of groups) byStatus[g.status] += 1;
    return {
      products: groups.length,
      units: groups.reduce((s, g) => s + g.totalUnits, 0),
      value: groups.reduce((s, g) => s + g.totalValue, 0),
      byStatus,
    };
  }, [groups]);

  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; value: number; units: number }>();
    for (const g of groups) {
      const name = g.category ?? "Uncategorized";
      const row = map.get(name) ?? { name, value: 0, units: 0 };
      row.value += g.totalValue;
      row.units += g.totalUnits;
      map.set(name, row);
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  }, [groups]);

  const topCategories = byCategory.slice(0, TOP_N);
  const maxValue = Math.max(1, ...topCategories.map((c) => c.value));

  /** Export the unit-level data — one row per physical unit, with its serial. */
  function exportCsv() {
    const header = ["Serial Number", "Brand", "Model", "Category", "Unit Price", "Added"];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = scoped.map((i) =>
      [
        i.serialNumber,
        i.brand,
        i.modelNo ?? "",
        i.category ?? "",
        i.price != null ? String(i.price) : "",
        i.createdAt ? new Date(i.createdAt).toISOString().slice(0, 10) : "",
      ]
        .map(escape)
        .join(","),
    );
    const csv = [header.map(escape).join(","), ...lines].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bitvault-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${scoped.length} units to CSV.`);
  }

  return (
    <>
      <Topbar title="Reports" onOpenNav={openNav} />

      <main className="space-y-lg p-md md:p-lg">
        <div className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
          <SelectField
            label="Period"
            wrapperClassName="w-full sm:w-48"
            value={range}
            onChange={(e) => setRange(e.target.value as RangeKey)}
          >
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </SelectField>
          <Button
            variant="secondary"
            icon="download"
            onClick={exportCsv}
            disabled={scoped.length === 0}
            className="w-full sm:w-auto"
          >
            Export CSV
          </Button>
        </div>

        <section className="grid grid-cols-2 gap-md lg:grid-cols-4">
          <StatCard label="Products" value={formatNumber(totals.products)} loading={isLoading} />
          <StatCard label="Units" value={formatNumber(totals.units)} loading={isLoading} />
          <StatCard
            label="Total Value"
            value={formatPrice(totals.value)}
            tone="primary"
            loading={isLoading}
          />
          <StatCard
            label="Needs Restocking"
            value={formatNumber(totals.byStatus.low_stock + totals.byStatus.out_of_stock)}
            tone={
              totals.byStatus.low_stock + totals.byStatus.out_of_stock > 0 ? "warning" : "default"
            }
            loading={isLoading}
          />
        </section>

        <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
          {/* Stock health */}
          <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md md:p-lg">
            <h2 className="mb-md text-body-md font-bold text-on-surface">Stock Health</h2>
            {totals.products === 0 ? (
              <Empty />
            ) : (
              <ul className="space-y-md">
                {(Object.keys(STATUS_META) as StockStatus[]).map((status) => {
                  const count = totals.byStatus[status];
                  const pct = Math.round((count / totals.products) * 100);
                  return (
                    <li key={status}>
                      <div className="mb-xs flex items-center justify-between text-body-sm">
                        <span className="text-on-surface">{STATUS_META[status].label}</span>
                        <span className="text-on-surface-variant">
                          {count} · {pct}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-variant">
                        <div
                          className={`h-full rounded-full ${STATUS_META[status].className}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Top categories by value */}
          <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md md:p-lg">
            <h2 className="mb-md text-body-md font-bold text-on-surface">Top Categories by Value</h2>
            {topCategories.length === 0 ? (
              <Empty />
            ) : (
              <>
                <ul className="space-y-md">
                  {topCategories.map((c) => (
                    <li key={c.name}>
                      <div className="mb-xs flex items-center justify-between gap-md text-body-sm">
                        <span className="truncate text-on-surface">{c.name}</span>
                        <span className="flex-shrink-0 text-on-surface-variant">
                          {formatPrice(c.value)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-variant">
                        <div
                          className="h-full rounded-full bg-primary-container"
                          style={{ width: `${Math.round((c.value / maxValue) * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                {/* Stay a summary as categories grow — don't become a second table. */}
                {byCategory.length > TOP_N && (
                  <p className="mt-md text-body-sm text-on-surface-variant">
                    Showing top {TOP_N} of {byCategory.length} categories.
                  </p>
                )}
              </>
            )}
          </section>
        </div>

        {/* Most valuable products */}
        <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md md:p-lg">
          <h2 className="mb-md text-body-md font-bold text-on-surface">Most Valuable Products</h2>
          {groups.length === 0 ? (
            <Empty />
          ) : (
            <ul className="divide-y divide-outline-variant">
              {[...groups]
                .sort((a, b) => b.totalValue - a.totalValue)
                .slice(0, TOP_N)
                .map((g) => (
                  <li key={g.key} className="flex items-center justify-between gap-md py-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-on-surface">
                        {itemDisplayName(g)}
                      </span>
                      <span className="text-body-sm text-on-surface-variant">
                        {formatNumber(g.totalUnits)} units · {g.category ?? "Uncategorized"}
                      </span>
                    </span>
                    <span className="flex-shrink-0 font-semibold text-on-surface">
                      {formatPrice(g.totalValue)}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

function Empty() {
  return (
    <div className="flex flex-col items-center gap-sm py-lg text-on-surface-variant">
      <Icon name="analytics" className="text-3xl text-outline-variant" />
      <p className="text-body-sm">No inventory in this period.</p>
    </div>
  );
}
