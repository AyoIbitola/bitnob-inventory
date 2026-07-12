import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/cn";
import { Topbar } from "@/components/layout/Topbar";
import { useLayout } from "@/components/layout/AppLayout";
import { Table, type Column } from "@/components/Table";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { InputField, TextareaField } from "@/components/FormField";
import { ApiError } from "@/api";
import { useToast } from "@/components/Toast";
import { RoleGate } from "@/auth/guards";
import { useAuth } from "@/auth/AuthContext";
import { useLowStockThreshold } from "@/features/settings/hooks";
import { formatNumber, formatPrice } from "@/lib/format";
import { fileToDownscaledDataUrl } from "@/lib/imageStore";
import { useItems } from "@/features/inventory/hooks";
import { groupItems } from "@/features/inventory/grouping";
import type { CategoryEntry } from "@/types";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useRemoveCategoryImage,
  useUpdateCategory,
  useUploadCategoryImage,
} from "./hooks";

interface CategoryRow {
  name: string;
  products: number;
  units: number;
  value: number;
  /** Products in this category that are low or out of stock. */
  atRisk: number;
  description?: string;
  imageUrl?: string;
}

/** Category-level stock health — the one thing a rollup view can show that the
 *  inventory table can't. Without it this page just repeats data. */
function HealthIndicator({ row }: { row: CategoryRow }) {
  if (row.products === 0) {
    return <span className="text-body-sm text-on-surface-variant">—</span>;
  }
  const healthy = row.atRisk === 0;
  return (
    <span className="flex items-center gap-sm">
      <span
        className={cn(
          "h-2 w-2 flex-shrink-0 rounded-full",
          healthy ? "bg-status-success-fg" : "bg-status-warning-fg",
        )}
      />
      <span className="text-body-sm text-on-surface-variant">
        {healthy ? "Healthy" : `${row.atRisk} need restocking`}
      </span>
    </span>
  );
}

function CategoryThumb({ row }: { row: CategoryRow }) {
  return (
    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-variant text-on-surface-variant">
      {row.imageUrl ? (
        <img src={row.imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <Icon name="category" className="text-[20px]" />
      )}
    </span>
  );
}

/**
 * Categories workspace. Backed by GET/POST/PATCH/DELETE /categories, which
 * merges product-derived counts with a category's own stored description and
 * image — a category can now exist with zero products.
 */
export function CategoriesPage() {
  const { openNav } = useLayout();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isAdmin = hasRole("admin");

  const { data: items, isLoading: itemsLoading } = useItems();
  const { data: categories, isLoading: catLoading, isError, refetch } = useCategories();
  const { threshold: lowStockThreshold } = useLowStockThreshold();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const uploadImage = useUploadCategoryImage();
  const removeImage = useRemoveCategoryImage();

  const isLoading = itemsLoading || catLoading;

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newImage, setNewImage] = useState<string | null>(null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImageBusy, setNewImageBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<CategoryRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);

  useEffect(() => {
    if (!editTarget) return;
    setEditName(editTarget.name);
    setEditDescription(editTarget.description ?? "");
    setEditError(null);
  }, [editTarget]);

  const rows = useMemo<CategoryRow[]>(() => {
    const groups = groupItems(items ?? [], lowStockThreshold);
    const byName = new Map<string, CategoryEntry>((categories ?? []).map((c) => [c.name, c]));

    // Union of every name we know about: from stored categories (including
    // product-less ones) and from products whose category the backend hasn't
    // gotten a metadata row for yet (matches how GET /categories merges them).
    const names = new Set<string>(byName.keys());
    for (const g of groups) if (g.category) names.add(g.category);

    return [...names]
      .map((name): CategoryRow => {
        const entry = byName.get(name);
        const inCategory = groups.filter((g) => g.category === name);
        return {
          name,
          products: inCategory.length,
          units: entry?.units ?? inCategory.reduce((s, g) => s + g.totalUnits, 0),
          value: entry?.totalValue ?? inCategory.reduce((s, g) => s + g.totalValue, 0),
          atRisk: inCategory.filter((g) => g.status !== "in_stock").length,
          description: entry?.description,
          imageUrl: entry?.imageUrl,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, categories, lowStockThreshold]);

  const existingNames = useMemo(() => rows.map((r) => r.name.toLowerCase()), [rows]);

  async function handleNewImage(file: File | undefined) {
    if (!file) return;
    setNewImageBusy(true);
    try {
      setNewImage(await fileToDownscaledDataUrl(file));
      setNewImageFile(file);
    } catch {
      setAddError("Couldn't process that image.");
    } finally {
      setNewImageBusy(false);
    }
  }

  async function handleAdd() {
    const name = newName.trim();
    setAddError(null);
    if (!name) return setAddError("Enter a category name.");
    if (existingNames.includes(name.toLowerCase()))
      return setAddError("That category already exists.");
    try {
      await createCategory.mutateAsync({ name, description: newDescription.trim() || undefined });
      // Image upload needs the category to exist first (it's keyed by id
      // server-side) — best-effort: the category is still created even if
      // this fails, just without a photo yet (addable later via Edit).
      if (newImageFile) {
        try {
          await uploadImage.mutateAsync({ name, file: newImageFile });
        } catch (err) {
          toast(
            err instanceof ApiError
              ? `Category added, but the image failed: ${err.message}`
              : "Category added, but the image upload failed.",
            "error",
          );
        }
      }
      toast(`Category "${name}" added.`);
      setNewName("");
      setNewDescription("");
      setNewImage(null);
      setNewImageFile(null);
      setAddOpen(false);
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : "Couldn't add that category.");
    }
  }

  async function handleEditSave() {
    if (!editTarget) return;
    const to = editName.trim();
    setEditError(null);
    if (!to) return setEditError("Enter a name.");
    if (to.toLowerCase() !== editTarget.name.toLowerCase() && existingNames.includes(to.toLowerCase()))
      return setEditError("That category already exists.");

    try {
      await updateCategory.mutateAsync({
        name: editTarget.name,
        input: {
          newName: to !== editTarget.name ? to : undefined,
          description: editDescription,
        },
      });
      toast(`Category "${to}" updated.`);
      setEditTarget(null);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Couldn't save changes.");
    }
  }

  async function handleImage(file: File | undefined) {
    if (!file || !editTarget) return;
    setImageBusy(true);
    try {
      await uploadImage.mutateAsync({ name: editTarget.name, file });
      toast("Image updated.");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't upload that image.", "error");
    } finally {
      setImageBusy(false);
    }
  }

  async function handleRemoveImage() {
    if (!editTarget) return;
    setImageBusy(true);
    try {
      await removeImage.mutateAsync(editTarget.name);
      toast("Image removed.");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't remove that image.", "error");
    } finally {
      setImageBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteCategory.mutateAsync(deleteTarget.name);
      toast(
        deleteTarget.units > 0
          ? `Category "${deleteTarget.name}" removed — ${deleteTarget.units} unit(s) are now uncategorized.`
          : `Category "${deleteTarget.name}" removed.`,
      );
      setDeleteTarget(null);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't delete that category.", "error");
    }
  }

  function closeAdd() {
    setAddOpen(false);
    setNewName("");
    setNewDescription("");
    setNewImage(null);
    setNewImageFile(null);
    setAddError(null);
  }

  const editImage = editTarget
    ? (rows.find((r) => r.name === editTarget.name)?.imageUrl ?? editTarget.imageUrl)
    : undefined;

  const columns: Column<CategoryRow>[] = [
    {
      key: "name",
      header: "Category",
      render: (r) => (
        <div className="flex items-center gap-sm">
          <CategoryThumb row={r} />
          <div className="min-w-0">
            <span className="block truncate font-semibold text-on-surface">{r.name}</span>
            {r.products === 0 && (
              <Badge tone="warning" className="mt-0.5">
                Unused
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    { key: "products", header: "Products", align: "right", render: (r) => formatNumber(r.products) },
    { key: "units", header: "Units", align: "right", render: (r) => formatNumber(r.units) },
    {
      key: "health",
      header: "Stock Health",
      hideBelow: "md",
      render: (r) => <HealthIndicator row={r} />,
    },
    {
      key: "value",
      header: "Total Value",
      align: "right",
      hideBelow: "lg",
      render: (r) => formatPrice(r.value),
    },
    ...(isAdmin
      ? [
          {
            key: "actions",
            header: "Actions",
            align: "right" as const,
            render: (r: CategoryRow) => (
              // Stop clicks here from also triggering the row's drill-through.
              <div className="flex justify-end gap-sm" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  aria-label={`Edit ${r.name}`}
                  onClick={() => setEditTarget(r)}
                  className="rounded p-1 text-on-surface-variant hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                >
                  <Icon name="edit" className="text-[20px]" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${r.name}`}
                  title={
                    r.products > 0
                      ? `Delete category — ${r.units} unit(s) will become uncategorized`
                      : "Delete category"
                  }
                  onClick={() => setDeleteTarget(r)}
                  className="rounded p-1 text-on-surface-variant hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-error"
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
          onRowClick={(r) => navigate(`/products?category=${encodeURIComponent(r.name)}`)}
          renderCard={(r) => (
            <div className="flex items-center gap-md">
              <CategoryThumb row={r} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-sm">
                  <span className="truncate font-semibold text-on-surface">{r.name}</span>
                  {r.products === 0 && <Badge tone="warning">Unused</Badge>}
                </div>
                <div className="text-body-sm text-on-surface-variant">
                  {formatNumber(r.products)} products · {formatNumber(r.units)} units
                </div>
              </div>
              <span className="flex-shrink-0 font-semibold">{formatPrice(r.value)}</span>
            </div>
          )}
          emptyState={
            <div className="flex flex-col items-center gap-sm text-on-surface-variant">
              <Icon name="category" className="text-3xl text-outline-variant" />
              <p className="font-semibold text-on-surface">No categories yet</p>
              <p>Categories appear here once products use them, or once an admin adds one.</p>
            </div>
          }
        />
      </main>

      {/* Add */}
      <Modal
        open={addOpen}
        onClose={closeAdd}
        title="Add Category"
        footer={
          <>
            <Button variant="secondary" onClick={closeAdd}>
              Cancel
            </Button>
            <Button onClick={handleAdd} loading={createCategory.isPending}>
              Add Category
            </Button>
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
          <TextareaField
            label="Description (optional)"
            rows={2}
            placeholder="What belongs in this category…"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />

          <div className="flex flex-col gap-xs">
            <span className="text-label-caps uppercase tracking-wider text-on-surface-variant">
              Category Image (optional)
            </span>
            {newImage ? (
              <div className="relative overflow-hidden rounded-lg border border-outline-variant">
                <img src={newImage} alt="" className="h-32 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setNewImage(null);
                    setNewImageFile(null);
                  }}
                  aria-label="Remove image"
                  className="absolute right-sm top-sm flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <Icon name="close" className="text-[18px]" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-sm rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low p-lg text-center transition-colors hover:bg-surface-container">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-variant text-primary">
                  <Icon name={newImageBusy ? "hourglass_empty" : "add_photo_alternate"} />
                </span>
                <span className="text-body-sm text-on-surface">
                  {newImageBusy ? "Processing…" : "Click to add an image"}
                </span>
                <span className="text-body-sm text-on-surface-variant">PNG, JPG or WebP</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={newImageBusy}
                  onChange={(e) => handleNewImage(e.target.files?.[0])}
                />
              </label>
            )}
          </div>

          <p className="text-body-sm text-on-surface-variant">
            It&apos;s selectable immediately when adding products.
          </p>
        </div>
      </Modal>

      {/* Edit (rename + description + image) */}
      <Modal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title={`Edit “${editTarget?.name ?? ""}”`}
        widthClass="max-w-[460px]"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setEditTarget(null)}
              disabled={updateCategory.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleEditSave} loading={updateCategory.isPending}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-md">
          {editError && (
            <p role="alert" className="text-body-sm text-error">
              {editError}
            </p>
          )}
          <InputField
            label="Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <TextareaField
            label="Description"
            rows={2}
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
          />

          {/* Representative image — uploaded/removed immediately, keyed off the
              still-saved name (not the unsaved rename draft above). */}
          <div className="flex flex-col gap-xs">
            <span className="text-label-caps uppercase tracking-wider text-on-surface-variant">
              Category Image
            </span>
            {editImage ? (
              <div className="relative overflow-hidden rounded-lg border border-outline-variant">
                <img src={editImage} alt="" className="h-32 w-full object-cover" />
                <div className="absolute right-sm top-sm flex gap-sm">
                  <label
                    title="Replace image"
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                  >
                    <Icon name="edit" className="text-[18px]" />
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      disabled={imageBusy}
                      onChange={(e) => handleImage(e.target.files?.[0])}
                    />
                    <span className="sr-only">Replace image</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={imageBusy}
                    aria-label="Remove image"
                    title="Remove image"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-error"
                  >
                    <Icon name="delete" className="text-[18px]" />
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-sm rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low p-lg text-center transition-colors hover:bg-surface-container">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-variant text-primary">
                  <Icon name={imageBusy ? "hourglass_empty" : "add_photo_alternate"} />
                </span>
                <span className="text-body-sm text-on-surface">
                  {imageBusy ? "Uploading…" : "Click to add an image"}
                </span>
                <span className="text-body-sm text-on-surface-variant">PNG, JPG or WebP</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={imageBusy}
                  onChange={(e) => handleImage(e.target.files?.[0])}
                />
              </label>
            )}
          </div>

          {editTarget && editTarget.products > 0 && (
            <p className="text-body-sm text-on-surface-variant">
              Renaming updates <strong>{formatNumber(editTarget.units)} unit(s)</strong> across{" "}
              {formatNumber(editTarget.products)} product(s).
            </p>
          )}
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`Delete “${deleteTarget?.name ?? ""}”?`}
        role="alertdialog"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteCategory.isPending}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleteCategory.isPending}>
              Delete
            </Button>
          </>
        }
      >
        {deleteTarget && deleteTarget.units > 0 ? (
          <p>
            <strong>{formatNumber(deleteTarget.units)} unit(s)</strong> currently carry this category.
            They will be kept, just uncategorized — no stock is deleted.
          </p>
        ) : (
          <p>This category has no units. Deleting it removes its description and image.</p>
        )}
      </Modal>
    </>
  );
}
