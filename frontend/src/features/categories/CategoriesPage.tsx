import { useMemo, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useLayout } from "@/components/layout/AppLayout";
import { Table, type Column } from "@/components/Table";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { InputField } from "@/components/FormField";
import { RoleGate } from "@/auth/guards";
import { useAuth } from "@/auth/AuthContext";
import { useSettings } from "@/settings/SettingsContext";
import { formatNumber, formatPrice } from "@/lib/format";
import { useItems, useRenameCategory } from "@/features/inventory/hooks";
import { pendingCategories } from "./localCategories";

interface CategoryRow {
  name: string;
  products: number;
  units: number;
  value: number;
  /** No product uses it yet — exists only locally. */
  pending: boolean;
}

/**
 * Categories workspace. Categories are just strings on products (no backend
 * table), so:
 *  - the list is derived from the catalog,
 *  - RENAME really works — it patches every unit in that category,
 *  - ADD stages a category locally until a product uses it,
 *  - DELETE is only offered for empty (unused) categories.
 */
export function CategoriesPage() {
  const { openNav } = useLayout();
  const { hasRole } = useAuth();
  const { settings } = useSettings();
  const isAdmin = hasRole("admin");

  const { data: items, isLoading, isError, refetch } = useItems();
  const renameCategory = useRenameCategory();

  const [pendingVersion, setPendingVersion] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const [renameTarget, setRenameTarget] = useState<CategoryRow | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  const rows = useMemo<CategoryRow[]>(() => {
    const map = new Map<string, CategoryRow>();

    for (const item of items ?? []) {
      const name = item.category?.trim();
      if (!name) continue;
      const row = map.get(name) ?? { name, products: 0, units: 0, value: 0, pending: false };
      row.units += item.quantity ?? 0;
      row.value += (item.price ?? 0) * (item.quantity ?? 0);
      map.set(name, row);
    }

    // Distinct products (brand + model) per category.
    for (const [name, row] of map) {
      row.products = new Set(
        (items ?? [])
          .filter((i) => i.category?.trim() === name)
          .map((i) => `${i.brand}|${i.modelNo ?? ""}`.toLowerCase()),
      ).size;
    }

    // Locally-staged categories no product uses yet.
    void pendingVersion;
    for (const name of pendingCategories.list()) {
      if (!map.has(name)) map.set(name, { name, products: 0, units: 0, value: 0, pending: true });
    }

    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [items, pendingVersion]);

  const existingNames = useMemo(() => rows.map((r) => r.name.toLowerCase()), [rows]);

  function handleAdd() {
    const name = newName.trim();
    setAddError(null);
    if (!name) return setAddError("Enter a category name.");
    if (existingNames.includes(name.toLowerCase()))
      return setAddError("That category already exists.");
    pendingCategories.add(name);
    setPendingVersion((v) => v + 1);
    setNewName("");
    setAddOpen(false);
  }

  async function handleRename() {
    if (!renameTarget) return;
    const to = renameValue.trim();
    setRenameError(null);
    if (!to) return setRenameError("Enter a new name.");
    if (
      to.toLowerCase() !== renameTarget.name.toLowerCase() &&
      existingNames.includes(to.toLowerCase())
    )
      return setRenameError("That category already exists.");

    if (renameTarget.pending) {
      pendingCategories.remove(renameTarget.name);
      pendingCategories.add(to);
      setPendingVersion((v) => v + 1);
    } else {
      const affected = (items ?? []).filter((i) => i.category?.trim() === renameTarget.name);
      try {
        await renameCategory.mutateAsync({ items: affected, to });
      } catch {
        return setRenameError("Couldn't rename every unit. Some may already have been updated.");
      }
    }
    setRenameTarget(null);
  }

  function handleDelete(row: CategoryRow) {
    // Only unused categories can be removed — deleting a used one would orphan products.
    pendingCategories.remove(row.name);
    setPendingVersion((v) => v + 1);
  }

  const columns: Column<CategoryRow>[] = [
    {
      key: "name",
      header: "Category",
      render: (r) => (
        <div className="flex items-center gap-sm">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface-variant text-on-surface-variant">
            <Icon name="category" className="text-[20px]" />
          </span>
          <span className="font-semibold text-on-surface">{r.name}</span>
          {r.pending && <Badge tone="warning">Unused</Badge>}
        </div>
      ),
    },
    { key: "products", header: "Products", align: "right", render: (r) => formatNumber(r.products) },
    { key: "units", header: "Units", align: "right", render: (r) => formatNumber(r.units) },
    {
      key: "value",
      header: "Total Value",
      align: "right",
      hideBelow: "md",
      render: (r) => formatPrice(r.value, settings.currency),
    },
    ...(isAdmin
      ? [
          {
            key: "actions",
            header: "Actions",
            align: "right" as const,
            render: (r: CategoryRow) => (
              <div className="flex justify-end gap-sm">
                <button
                  type="button"
                  aria-label={`Rename ${r.name}`}
                  onClick={() => {
                    setRenameTarget(r);
                    setRenameValue(r.name);
                    setRenameError(null);
                  }}
                  className="rounded p-1 text-on-surface-variant hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                >
                  <Icon name="edit" className="text-[20px]" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${r.name}`}
                  disabled={!r.pending}
                  title={r.pending ? "Delete category" : "In use — reassign its products first"}
                  onClick={() => handleDelete(r)}
                  className="rounded p-1 text-on-surface-variant hover:text-error disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Icon name="delete" className="text-[20px]" />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <Topbar title="Categories" onOpenNav={openNav} />

      <main className="space-y-lg p-md md:p-lg">
        <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body-sm text-on-surface-variant">
            {rows.length} categor{rows.length === 1 ? "y" : "ies"}. Renaming updates every product
            in that category.
          </p>
          <RoleGate role="admin">
            <Button icon="add" onClick={() => setAddOpen(true)} className="w-full sm:w-auto">
              Add Category
            </Button>
          </RoleGate>
        </div>

        <Table
          caption="Categories"
          columns={columns}
          rows={rows}
          rowKey={(r) => r.name}
          isLoading={isLoading}
          error={isError ? "Couldn't load categories." : null}
          onRetry={() => refetch()}
          renderCard={(r) => (
            <div className="flex items-center justify-between gap-md">
              <div className="min-w-0">
                <div className="flex items-center gap-sm">
                  <span className="truncate font-semibold text-on-surface">{r.name}</span>
                  {r.pending && <Badge tone="warning">Unused</Badge>}
                </div>
                <div className="text-body-sm text-on-surface-variant">
                  {formatNumber(r.products)} products · {formatNumber(r.units)} units
                </div>
              </div>
              <span className="flex-shrink-0 font-semibold">
                {formatPrice(r.value, settings.currency)}
              </span>
            </div>
          )}
          emptyState={
            <div className="flex flex-col items-center gap-sm text-on-surface-variant">
              <Icon name="category" className="text-3xl text-outline-variant" />
              <p className="font-semibold text-on-surface">No categories yet</p>
              <p>Categories appear here once products use them.</p>
            </div>
          }
        />
      </main>

      {/* Add */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Category"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>Add Category</Button>
          </>
        }
      >
        <div className="space-y-md">
          {addError && (
            <p role="alert" className="text-body-sm text-error">
              {addError}
            </p>
          )}
          <InputField
            label="Category name"
            placeholder="e.g. Monitors"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <p className="text-body-sm text-on-surface-variant">
            It&apos;s selectable immediately when adding products, and becomes permanent once a
            product uses it.
          </p>
        </div>
      </Modal>

      {/* Rename */}
      <Modal
        open={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        title={`Rename “${renameTarget?.name ?? ""}”`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setRenameTarget(null)}
              disabled={renameCategory.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleRename} loading={renameCategory.isPending}>
              Rename
            </Button>
          </>
        }
      >
        <div className="space-y-md">
          {renameError && (
            <p role="alert" className="text-body-sm text-error">
              {renameError}
            </p>
          )}
          <InputField
            label="New name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
          />
          {renameTarget && !renameTarget.pending && (
            <p className="text-body-sm text-on-surface-variant">
              This updates <strong>{formatNumber(renameTarget.units)} unit(s)</strong> across{" "}
              {formatNumber(renameTarget.products)} product(s).
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
