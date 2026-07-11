import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { useSettings } from "@/settings/SettingsContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatNumber, formatPrice } from "@/lib/format";
import type { Item, ProductGroup, StockStatus } from "@/types";
import { useItems } from "./hooks";
import { groupItems } from "./grouping";
import { ProductDetailPanel } from "./ProductDetailPanel";
import { ProductFormPanel } from "./ProductFormPanel";
import { UnitFormPanel } from "./UnitFormPanel";
import { DeleteItemModal } from "./DeleteItemModal";
import { AiSearchDialog } from "./AiSearchDialog";

const STATUS_OPTIONS: Array<{ value: StockStatus | ""; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "in_stock", label: "In Stock" },
  { value: "low_stock", label: "Low Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
];

/**
 * Inventory workspace. Lists PRODUCTS (brand + model + category); each row
 * aggregates the individual units beneath it. Click a product to see every unit
 * and its serial (product ID). Admin-only controls are wrapped in <RoleGate>.
 */
export function InventoryPage() {
  const { openNav } = useLayout();
  const { settings } = useSettings();
  const { lowStockThreshold, pageSize } = settings;

  const { data: items, isLoading, isError, refetch } = useItems();

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 250);

  // Category lives in the URL so Categories → "view products" deep-links here,
  // and the filtered view is shareable/bookmarkable.
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") ?? "";
  const setCategory = (value: string) => {
    setSearchParams(
      (params) => {
        if (value) params.set("category", value);
        else params.delete("category");
        return params;
      },
      { replace: true },
    );
  };

  const [status, setStatus] = useState<StockStatus | "">("");
  const [page, setPage] = useState(1);

  // Overlays
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [productFormOpen, setProductFormOpen] = useState(false);
  /** When adding units to an existing product, pre-fill its brand/model/category. */
  const [prefill, setPrefill] = useState<ProductGroup | null>(null);
  const [editUnit, setEditUnit] = useState<Item | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  const allGroups = useMemo(
    () => groupItems(items ?? [], lowStockThreshold),
    [items, lowStockThreshold],
  );

  const categories = useMemo(
    () =>
      Array.from(new Set((items ?? []).map((i) => i.category).filter((c): c is string => !!c))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allGroups
      .filter((g) => {
        if (category && g.category !== category) return false;
        if (status && g.status !== status) return false;
        if (q) {
          const haystack =
            `${g.name} ${g.category ?? ""} ${g.units.map((u) => u.serialNumber).join(" ")}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [allGroups, category, status, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Summary derived from the same fetch — no extra requests.
  const summary = useMemo(() => {
    const totalUnits = allGroups.reduce((s, g) => s + g.totalUnits, 0);
    return {
      products: allGroups.length,
      totalUnits,
      totalValue: allGroups.reduce((s, g) => s + g.totalValue, 0),
      lowStock: allGroups.filter((g) => g.status === "low_stock").length,
      outOfStock: allGroups.filter((g) => g.status === "out_of_stock").length,
    };
  }, [allGroups]);

  const detailGroup = detailKey ? (allGroups.find((g) => g.key === detailKey) ?? null) : null;
  const hasFilters = !!(search || category || status);
  const isEmptyCatalog = !isLoading && !isError && allGroups.length === 0;

  function resetFilters() {
    setSearchInput("");
    setCategory("");
    setStatus("");
    setPage(1);
  }

  const columns = useMemo<Column<ProductGroup>[]>(
    () => [
      // Category first — standard inventory table ordering.
      {
        key: "category",
        header: "Category",
        render: (g) => (g.category ? <Badge>{g.category}</Badge> : <span>—</span>),
      },
      {
        key: "product",
        header: "Product",
        render: (g) => (
          <div className="min-w-0">
            <span className="block truncate font-semibold text-on-surface">{g.name}</span>
            <span className="text-body-sm text-on-surface-variant">
              {g.units.length === 1 ? "1 unit tracked" : `${g.units.length} units tracked`}
            </span>
          </div>
        ),
      },
      {
        key: "units",
        header: "Units",
        align: "right",
        render: (g) => <span className="font-semibold">{formatNumber(g.totalUnits)}</span>,
      },
      {
        key: "unitPrice",
        header: "Unit Price",
        align: "right",
        hideBelow: "lg",
        render: (g) => formatPrice(g.unitPrice),
      },
      {
        key: "totalValue",
        header: "Total Value",
        align: "right",
        hideBelow: "lg",
        render: (g) => (
          <span className="font-semibold">{formatPrice(g.totalValue)}</span>
        ),
      },
      { key: "status", header: "Status", render: (g) => <StatusBadge status={g.status} /> },
    ],
    [],
  );

  return (
    <>
      <Topbar title="Inventory" onOpenNav={openNav}>
        {/* Wide enough that the placeholder never truncates — a cut-off
            placeholder hides what's actually searchable. */}
        <div className="relative hidden md:block">
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
            placeholder="Search by brand, serial, or category"
            aria-label="Search inventory by brand, serial number, or category"
            className="h-10 w-72 rounded-lg border border-outline-variant bg-surface-container-low pl-10 pr-md text-body-md focus-ring lg:w-[380px]"
          />
        </div>
        {/* Separated from search so it doesn't read as part of the field, and
            titled so first-timers know what "Ask AI" actually does. */}
        <Button
          variant="secondary"
          size="sm"
          icon="auto_awesome"
          className="ml-sm"
          title="Ask AI: query your inventory in plain English, e.g. “what's low on stock?”"
          onClick={() => setAiOpen(true)}
        >
          <span className="hidden sm:inline">Ask AI</span>
        </Button>
      </Topbar>

      <main className="space-y-lg p-md md:p-lg">
        {/* Summary */}
        <section
          aria-label="Inventory summary"
          className="grid grid-cols-2 gap-md md:grid-cols-3 xl:grid-cols-5 xl:gap-gutter"
        >
          <StatCard
            label="Products"
            value={formatNumber(summary.products)}
            loading={isLoading}
            icon="inventory_2"
          />
          <StatCard
            label="Total Units"
            value={formatNumber(summary.totalUnits)}
            loading={isLoading}
            icon="numbers"
          />
          <StatCard
            label="Total Value"
            value={formatPrice(summary.totalValue)}
            loading={isLoading}
            tone="primary"
            icon="payments"
          />
          {/* Only alarm-colour these when they're actually a problem. */}
          <StatCard
            label="Low Stock"
            value={formatNumber(summary.lowStock)}
            loading={isLoading}
            tone={summary.lowStock > 0 ? "warning" : "default"}
            icon="trending_down"
            hint={`${lowStockThreshold} units or fewer`}
          />
          <StatCard
            label="Out of Stock"
            value={formatNumber(summary.outOfStock)}
            loading={isLoading}
            tone={summary.outOfStock > 0 ? "error" : "default"}
            icon="production_quantity_limits"
            hint={summary.outOfStock === 0 ? "All products in stock" : "Needs restocking"}
          />
        </section>

        {/* Mobile search */}
        <div className="relative md:hidden">
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
            placeholder="Search product, serial…"
            aria-label="Search inventory"
            className="h-11 w-full rounded-lg border border-outline-variant bg-surface-container-low pl-10 pr-md text-body-md focus-ring"
          />
        </div>

        {/* Filters + admin Add */}
        <section className="flex flex-col gap-md sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-end gap-md">
            <SelectField
              label="Category"
              value={category}
              wrapperClassName="w-full min-w-0 flex-1 sm:w-44 sm:flex-none"
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Status"
              value={status}
              wrapperClassName="w-full min-w-0 flex-1 sm:w-44 sm:flex-none"
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
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Clear
              </Button>
            )}
          </div>

          <RoleGate role="admin">
            <Button icon="add" onClick={() => setProductFormOpen(true)} className="w-full sm:w-auto">
              Add Product
            </Button>
          </RoleGate>
        </section>

        {/* Screen-reader announcement of result count */}
        <p aria-live="polite" className="sr-only">
          {isLoading ? "Loading inventory" : `${filtered.length} products found`}
        </p>

        {/* Table */}
        <section>
          <Table
            caption="Products in inventory"
            columns={columns}
            rows={pageRows}
            rowKey={(g) => g.key}
            onRowClick={(g) => setDetailKey(g.key)}
            isLoading={isLoading}
            error={isError ? "Couldn't load inventory." : null}
            onRetry={() => refetch()}
            renderCard={(g) => (
              <div className="flex items-start justify-between gap-md">
                <div className="min-w-0">
                  <span className="block truncate font-semibold text-on-surface">{g.name}</span>
                  <div className="mt-xs flex flex-wrap items-center gap-sm">
                    {g.category && <Badge>{g.category}</Badge>}
                    <StatusBadge status={g.status} />
                  </div>
                  <div className="mt-xs text-body-sm text-on-surface-variant">
                    {formatNumber(g.totalUnits)} units · {formatPrice(g.unitPrice)} each
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="font-semibold text-on-surface">
                    {formatPrice(g.totalValue)}
                  </div>
                  <div className="text-body-sm text-on-surface-variant">total</div>
                </div>
              </div>
            )}
            emptyState={
              <div className="flex flex-col items-center gap-sm text-on-surface-variant">
                <Icon name="inventory_2" className="text-3xl text-outline-variant" />
                {isEmptyCatalog ? (
                  <>
                    <p className="font-semibold text-on-surface">No products yet</p>
                    <p>Add your first product to start tracking inventory.</p>
                    <RoleGate role="admin">
                      <Button icon="add" className="mt-sm" onClick={() => setProductFormOpen(true)}>
                        Add Product
                      </Button>
                    </RoleGate>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-on-surface">No matching products</p>
                    <p>No products match your search or filters.</p>
                    <Button variant="secondary" size="sm" className="mt-sm" onClick={resetFilters}>
                      Clear filters
                    </Button>
                  </>
                )}
              </div>
            }
          />
          {filtered.length > pageSize && (
            <div className="rounded-b-lg border border-t-0 border-outline-variant bg-surface-container-lowest">
              <Pagination
                page={currentPage}
                pageSize={pageSize}
                total={filtered.length}
                onPageChange={setPage}
              />
            </div>
          )}
        </section>
      </main>

      {/* Overlays */}
      <ProductDetailPanel
        group={detailGroup}
        open={detailKey !== null}
        onClose={() => setDetailKey(null)}
        onEditUnit={(unit) => setEditUnit(unit)}
        onDeleteUnit={(unit) => setDeleteTarget(unit)}
        onAddUnits={(g) => {
          setDetailKey(null);
          setProductFormOpen(true);
          setPrefill(g);
        }}
      />
      <ProductFormPanel
        open={productFormOpen}
        prefill={prefill}
        knownCategories={categories}
        onClose={() => {
          setProductFormOpen(false);
          setPrefill(null);
        }}
      />
      <UnitFormPanel
        open={editUnit !== null}
        unit={editUnit}
        knownCategories={categories}
        onClose={() => setEditUnit(null)}
      />
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
          const g = allGroups.find((grp) => grp.units.some((u) => u.id === item.id));
          if (g) setDetailKey(g.key);
        }}
      />
    </>
  );
}
