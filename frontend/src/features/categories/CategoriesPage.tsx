import { useMemo } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useLayout } from "@/components/layout/AppLayout";
import { Table, type Column } from "@/components/Table";
import { Badge } from "@/components/Badge";
import { formatNumber, formatPrice } from "@/lib/format";
import { CURRENCY } from "@/config";
import { useAllItems } from "@/features/inventory/hooks";

interface CategoryRow {
  name: string;
  count: number;
  quantity: number;
  value: number;
}

/**
 * Categories overview. The backend has no category endpoint — categories are
 * just strings on products — so we derive counts/value client-side from the
 * catalog. Read-only for all roles.
 */
export function CategoriesPage() {
  const { openNav } = useLayout();
  const { data: items, isLoading, isError, refetch } = useAllItems();

  const rows = useMemo<CategoryRow[]>(() => {
    const map = new Map<string, CategoryRow>();
    for (const item of items ?? []) {
      const name = item.category ?? "Uncategorized";
      const row = map.get(name) ?? { name, count: 0, quantity: 0, value: 0 };
      row.count += 1;
      row.quantity += item.quantity;
      row.value += (item.price ?? 0) * item.quantity;
      map.set(name, row);
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [items]);

  const columns: Column<CategoryRow>[] = [
    { key: "name", header: "Category", render: (r) => <Badge>{r.name}</Badge> },
    { key: "count", header: "Products", render: (r) => formatNumber(r.count) },
    {
      key: "quantity",
      header: "Total units",
      hideBelow: "md",
      render: (r) => formatNumber(r.quantity),
    },
    {
      key: "value",
      header: `Value (${CURRENCY})`,
      align: "right",
      render: (r) => formatPrice(r.value),
    },
  ];

  return (
    <>
      <Topbar title="Categories" onOpenNav={openNav} />
      <main className="space-y-lg p-lg">
        <p className="text-body-sm text-on-surface-variant">
          {rows.length} categor{rows.length === 1 ? "y" : "ies"} across the catalog.
        </p>
        <Table
          caption="Categories"
          columns={columns}
          rows={rows}
          rowKey={(r) => r.name}
          isLoading={isLoading}
          error={isError ? "Couldn't load categories." : null}
          onRetry={() => refetch()}
          emptyState={<span className="text-on-surface-variant">No categories yet.</span>}
        />
      </main>
    </>
  );
}
