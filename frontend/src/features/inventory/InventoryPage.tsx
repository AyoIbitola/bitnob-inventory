import { useMemo, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useLayout } from "@/components/layout/AppLayout";
import { Table, type Column } from "@/components/Table";
import { Badge, StatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { StatCard } from "@/components/StatCard";
import { Pagination } from "@/components/Pagination";
import { SelectField } from "@/components/FormField";
import { RoleGate } from "@/auth/guards";
import { useAuth } from "@/auth/AuthContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatDate, formatNumber, formatPrice, itemDisplayName } from "@/lib/format";
import { imageStore } from "@/lib/imageStore";
import { DEFAULT_PAGE_SIZE } from "@/config";
import type { Item, StockStatus } from "@/types";
import { useCategories, useInventorySummary, useItems } from "./hooks";
import { ItemDetailPanel } from "./ItemDetailPanel";
import { ItemFormPanel } from "./ItemFormPanel";
import { DeleteItemModal } from "./DeleteItemModal";
import { AiSearchDialog } from "./AiSearchDialog";

const STATUS_OPTIONS: Array<{ value: StockStatus | ""; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "in_stock", label: "In Stock" },
  { value: "low_stock", label: "Low Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
];

/**
 * Inventory workspace, role-adaptive. Staff get browse/search/filter/detail;
 * admins additionally get Add, an Actions column, and edit/delete — all via
 * <RoleGate>, so controls never render for staff (req #3).
 */
export function InventoryPage() {
  const { openNav } = useLayout();
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<StockStatus | "">("");
  const [page, setPage] = useState(1);

  const query = useMemo(
    () => ({
      search: search || undefined,
      category: category || undefined,
      status: status || undefined,
      page,
      pageSize: DEFAULT_PAGE_SIZE,
    }),
    [search, category, status, page],
  );

  const { data, isLoading, isError, refetch, isPlaceholderData } = useItems(query);
  const { data: categories } = useCategories();
  const summary = useInventorySummary();

  // Overlays
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formItem, setFormItem] = useState<Item | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  function openCreate() {
    setFormItem(null);
    setFormOpen(true);
  }
  function openEdit(item: Item) {
    setFormItem(item);
    setFormOpen(true);
    setDetailId(null);
  }
  function openDelete(item: Item) {
    setDeleteTarget(item);
    setDetailId(null);
  }

  const columns = useMemo<Column<Item>[]>(() => {
    const base: Column<Item>[] = [
      {
        key: "product",
        header: "Product",
        render: (item) => {
          const img = imageStore.get(item.id);
          return (
            <div className="flex items-center gap-md">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-surface-variant">
                {img ? (
                  <img src={img} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Icon name="inventory_2" className="text-[20px] text-on-surface-variant" />
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate font-semibold text-on-surface">
                  {itemDisplayName(item)}
                </div>
                <div className="text-body-sm text-on-surface-variant">{item.serialNumber}</div>
              </div>
            </div>
          );
        },
      },
      {
        key: "category",
        header: "Category",
        hideBelow: "md",
        render: (item) => (item.category ? <Badge>{item.category}</Badge> : <span>—</span>),
      },
      { key: "stock", header: "Stock", render: (item) => formatNumber(item.quantity) },
      { key: "status", header: "Status", render: (item) => <StatusBadge status={item.status} /> },
      {
        key: "price",
        header: "Price",
        align: "right",
        hideBelow: "lg",
        render: (item) => formatPrice(item.price, item.currency),
      },
      {
        key: "updated",
        header: "Updated",
        hideBelow: "lg",
        render: (item) => (
          <span className="text-body-sm text-on-surface-variant">{formatDate(item.updatedAt)}</span>
        ),
      },
    ];

    if (isAdmin) {
      base.push({
        key: "actions",
        header: "Actions",
        align: "right",
        render: (item) => (
          <div
            className="flex justify-end gap-md opacity-60 transition-opacity group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label={`Edit ${itemDisplayName(item)}`}
              className="text-on-surface-variant hover:text-primary"
              onClick={() => openEdit(item)}
            >
              <Icon name="edit" />
            </button>
            <button
              type="button"
              aria-label={`Delete ${itemDisplayName(item)}`}
              className="text-on-surface-variant hover:text-error"
              onClick={() => openDelete(item)}
            >
              <Icon name="delete" />
            </button>
          </div>
        ),
      });
    }
    return base;
  }, [isAdmin]);

  return (
    <>
      <Topbar title="Inventory" onOpenNav={openNav}>
        <div className="relative hidden sm:block">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            placeholder="Search brand, serial, category…"
            aria-label="Search inventory"
            className="h-10 w-64 rounded-lg border border-outline-variant bg-surface-container-low pl-10 pr-md text-body-md focus-ring"
          />
        </div>
        <Button variant="secondary" size="sm" icon="auto_awesome" onClick={() => setAiOpen(true)}>
          Ask AI
        </Button>
      </Topbar>

      <main className="space-y-lg p-lg">
        {/* Summary */}
        <section aria-label="Inventory summary" className="grid grid-cols-2 gap-gutter md:grid-cols-4">
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

        {/* Filters + admin Add */}
        <section className="flex flex-wrap items-end justify-between gap-md">
          <div className="flex flex-wrap items-end gap-md">
            <SelectField
              label="Category"
              value={category}
              wrapperClassName="w-48"
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All categories</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Status"
              value={status}
              wrapperClassName="w-48"
              onChange={(e) => {
                setStatus(e.target.value as StockStatus | "");
                setPage(1);
              }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </SelectField>
          </div>

          <RoleGate role="admin">
            <Button icon="add" onClick={openCreate}>
              Add Item
            </Button>
          </RoleGate>
        </section>

        {/* Table */}
        <section className={isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
          <Table
            caption="Inventory items"
            columns={columns}
            rows={data?.data ?? []}
            rowKey={(item) => item.id}
            onRowClick={(item) => setDetailId(item.id)}
            isLoading={isLoading}
            error={isError ? "Couldn't load inventory." : null}
            onRetry={() => refetch()}
            emptyState={
              <div className="flex flex-col items-center gap-sm text-on-surface-variant">
                <Icon name="inventory_2" className="text-3xl text-outline-variant" />
                <p>No items match your filters.</p>
              </div>
            }
          />
          {data && data.total > 0 && (
            <div className="rounded-b-lg border border-t-0 border-outline-variant bg-surface-container-lowest">
              <Pagination
                page={data.page}
                pageSize={data.pageSize}
                total={data.total}
                onPageChange={setPage}
              />
            </div>
          )}
        </section>
      </main>

      {/* Overlays */}
      <ItemDetailPanel
        itemId={detailId}
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        onEdit={openEdit}
        onDelete={openDelete}
      />
      <ItemFormPanel open={formOpen} item={formItem} onClose={() => setFormOpen(false)} />
      <DeleteItemModal
        item={deleteTarget}
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
      />
      <AiSearchDialog
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onSelectItem={(item) => {
          setAiOpen(false);
          setDetailId(item.id);
        }}
      />
    </>
  );
}
