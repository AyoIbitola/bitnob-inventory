import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { SidePanel } from "@/components/SidePanel";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { InputField, TextareaField } from "@/components/FormField";
import { useToast } from "@/components/Toast";
import { ApiError } from "@/api";
import { CURRENCY } from "@/config";
import { fileToDownscaledDataUrl, imageStore } from "@/lib/imageStore";
import { itemDisplayName } from "@/lib/format";
import type { Item, ItemInput, ProductGroup } from "@/types";
import { useCreateUnits, useUploadImage } from "./hooks";

interface ProductFormPanelProps {
  open: boolean;
  onClose: () => void;
  /** When set, we're adding MORE units to an existing product. */
  prefill: ProductGroup | null;
  knownCategories: string[];
  /** Full catalog — used to populate each unit's "Attached to" dropdown. */
  allUnits: Item[];
}

/** A unit being drafted: its serial (product ID), its own description, and
 * optionally the existing unit it's attached to (e.g. a bundled mouse). */
interface UnitDraft {
  serial: string;
  description: string;
  attachedToId: string;
}

/**
 * Add a product and its units.
 *
 * The backend enforces a UNIQUE serial per row, so one row = one physical unit.
 * This form therefore collects the product's shared details ONCE and then a
 * serial number per unit, creating one record each. That is what gives every
 * unit its own product ID.
 */
export function ProductFormPanel({
  open,
  onClose,
  prefill,
  knownCategories,
  allUnits,
}: ProductFormPanelProps) {
  const { toast } = useToast();
  const createUnits = useCreateUnits();
  const uploadImage = useUploadImage();

  const [brand, setBrand] = useState("");
  const [modelNo, setModelNo] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  /** Fallback only — used for a unit that has no description of its own. */
  const [defaultDescription, setDefaultDescription] = useState("");
  /** One row per PHYSICAL unit: its serial (product ID) and its OWN description. */
  const [units, setUnits] = useState<UnitDraft[]>([
    { serial: "", description: "", attachedToId: "" },
  ]);

  // Eligible parents: existing units only (a batch can't attach to a sibling
  // not yet created), and not already an accessory of something else — the
  // backend rejects attachment chains, so mirror that here.
  const eligibleParents = allUnits.filter((u) => !u.attachedToId);

  /** Preview shown in the form. */
  const [image, setImage] = useState<string | null>(null);
  /** The real file, uploaded to the backend after the unit exists (needs its id). */
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failures, setFailures] = useState<Array<{ serialNumber: string; message: string }>>([]);

  const lockedProduct = !!prefill;

  useEffect(() => {
    if (!open) return;
    setBrand(prefill?.brand ?? "");
    setModelNo(prefill?.modelNo ?? "");
    setCategory(prefill?.category ?? "");
    setPrice(prefill?.unitPrice != null ? String(prefill.unitPrice) : "");
    setDefaultDescription("");
    setUnits([{ serial: "", description: "", attachedToId: "" }]);
    setImage(null);
    setImageFile(null);
    setError(null);
    setFailures([]);
  }, [open, prefill]);

  function setUnitField(index: number, field: keyof UnitDraft, value: string) {
    setUnits((prev) => prev.map((u, i) => (i === index ? { ...u, [field]: value } : u)));
  }
  function addUnit() {
    setUnits((prev) => [...prev, { serial: "", description: "", attachedToId: "" }]);
  }
  function removeUnit(index: number) {
    setUnits((prev) =>
      prev.length === 1
        ? [{ serial: "", description: "", attachedToId: "" }]
        : prev.filter((_, i) => i !== index),
    );
  }

  /** Paste many serials at once (newline/comma separated) into separate units. */
  function handlePasteSerials(index: number, text: string) {
    const parts = text
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length <= 1) return false;
    setUnits((prev) => {
      const next = [...prev];
      next.splice(
        index,
        1,
        ...parts.map((serial) => ({ serial, description: "", attachedToId: "" })),
      );
      return next;
    });
    return true;
  }

  async function handleImage(file: File | undefined) {
    if (!file) return;
    setImageBusy(true);
    try {
      setImage(await fileToDownscaledDataUrl(file)); // local preview
      setImageFile(file); // the real upload happens once the unit has an id
    } catch {
      setError("Couldn't process that image.");
    } finally {
      setImageBusy(false);
    }
  }

  /**
   * Push the image to the backend (Cloudinary) so every user sees it.
   * If the server has no Cloudinary credentials yet it returns 503 — in that
   * case we keep the browser-local stopgap so the admin isn't blocked, and say
   * so plainly rather than pretending it was shared.
   */
  async function persistImage(itemId: string) {
    if (!imageFile) return;
    try {
      await uploadImage.mutateAsync({ id: itemId, file: imageFile });
    } catch (err) {
      if (image) imageStore.set(itemId, image);
      const notConfigured = err instanceof ApiError && err.status === 503;
      toast(
        notConfigured
          ? "Image saved on this device only — shared images need Cloudinary credentials."
          : "Item saved, but the image upload failed.",
        "error",
      );
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFailures([]);

    const drafts = units
      .map((u) => ({
        serial: u.serial.trim(),
        description: u.description.trim(),
        attachedToId: u.attachedToId,
      }))
      .filter((u) => u.serial);

    if (!brand.trim()) return setError("Brand is required.");
    if (drafts.length === 0)
      return setError("Add at least one serial number — each unit needs its own.");

    const serialList = drafts.map((u) => u.serial);
    const dupes = serialList.filter((s, i) => serialList.indexOf(s) !== i);
    if (dupes.length)
      return setError(`Duplicate serial number(s): ${[...new Set(dupes)].join(", ")}`);

    const priceValue = price.trim() === "" ? undefined : Number(price);
    if (priceValue !== undefined && (!Number.isFinite(priceValue) || priceValue < 0))
      return setError("Enter a valid, non-negative unit price.");

    const fallback = defaultDescription.trim();

    const inputs: ItemInput[] = drafts.map((u) => ({
      serialNumber: u.serial,
      brand: brand.trim(),
      modelNo: modelNo.trim() || undefined,
      category: category.trim() || undefined,
      // Each unit keeps its OWN description; the shared field is only a fallback
      // for units left blank (e.g. 20 identical cables).
      description: u.description || fallback || undefined,
      price: priceValue,
      attachedToId: u.attachedToId || null,
    }));

    const { created, failed } = await createUnits.mutateAsync(inputs);

    if (created[0]) await persistImage(created[0].id);

    if (failed.length) {
      setFailures(failed);
      // Keep only the failed units (with their descriptions) so they can be fixed.
      const failedSerials = new Set(failed.map((f) => f.serialNumber));
      setUnits(drafts.filter((u) => failedSerials.has(u.serial)));
      if (created.length === 0) setError("None of the units could be saved.");
      else toast(`Saved ${created.length} of ${inputs.length} units.`, "error");
      return;
    }

    toast(
      created.length === 1
        ? `Added 1 unit of ${brand.trim()}.`
        : `Added ${created.length} units of ${brand.trim()}.`,
    );
    onClose();
  }

  const unitCount = units.filter((u) => u.serial.trim()).length;
  const formId = "product-form";

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title={lockedProduct ? `Add Units — ${prefill?.name}` : "Add Product"}
      footer={
        <div className="flex w-full items-center justify-end gap-md">
          <Button variant="ghost" onClick={onClose} disabled={createUnits.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={createUnits.isPending}>
            {unitCount > 1 ? `Save ${unitCount} Units` : "Save Unit"}
          </Button>
        </div>
      }
    >
      <form id={formId} className="space-y-lg" onSubmit={handleSubmit} noValidate>
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-error-container bg-error-container/50 px-md py-sm text-body-sm text-on-error-container"
          >
            {error}
          </div>
        )}

        {failures.length > 0 && (
          <div
            role="alert"
            className="rounded-lg border border-status-warning-fg/30 bg-status-warning-bg px-md py-sm text-body-sm text-status-warning-fg"
          >
            <p className="font-semibold">These units were not saved:</p>
            <ul className="mt-xs list-inside list-disc">
              {failures.map((f) => (
                <li key={f.serialNumber}>
                  <code>{f.serialNumber}</code> — {f.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Shared product details */}
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <InputField
            label="Brand"
            placeholder="e.g. Logitech"
            required
            disabled={lockedProduct}
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
          <InputField
            label="Model No."
            placeholder="e.g. M185"
            disabled={lockedProduct}
            value={modelNo}
            onChange={(e) => setModelNo(e.target.value)}
          />
        </div>

        <InputField
          label="Category"
          placeholder="e.g. Peripherals"
          list="known-categories"
          disabled={lockedProduct}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <datalist id="known-categories">
          {knownCategories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <InputField
          label={`Unit Price (${CURRENCY})`}
          inputMode="decimal"
          placeholder="0.00"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <TextareaField
          label="Default description (optional)"
          rows={2}
          placeholder="Used only for units you leave blank below…"
          value={defaultDescription}
          onChange={(e) => setDefaultDescription(e.target.value)}
        />

        {/* Per-unit rows: each physical unit gets its own serial AND description */}
        <div className="flex flex-col gap-sm">
          <span className="text-label-caps uppercase tracking-wider text-on-surface-variant">
            Units · {unitCount} {unitCount === 1 ? "unit" : "units"}
          </span>
          <p className="text-body-sm text-on-surface-variant">
            Every physical unit has its own serial number (its product ID) and its own description —
            condition and notes differ per device. Paste a list of serials to add many at once.
          </p>

          <div className="space-y-md">
            {units.map((unit, index) => (
              <div
                key={index}
                className="rounded-lg border border-outline-variant bg-surface-container-low p-sm"
              >
                <div className="flex items-center gap-sm">
                  <span className="w-5 flex-shrink-0 text-right text-body-sm font-semibold text-on-surface-variant">
                    {index + 1}
                  </span>
                  <input
                    value={unit.serial}
                    onChange={(e) => setUnitField(index, "serial", e.target.value)}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData("text");
                      if (handlePasteSerials(index, text)) e.preventDefault();
                    }}
                    placeholder={`Serial no. e.g. SN-${String(index + 1).padStart(3, "0")}`}
                    aria-label={`Serial number for unit ${index + 1}`}
                    className="h-11 w-full min-w-0 rounded-lg border border-outline-variant bg-surface-container-lowest px-md text-body-md focus-ring"
                  />
                  <button
                    type="button"
                    onClick={() => removeUnit(index)}
                    aria-label={`Remove unit ${index + 1}`}
                    className="flex-shrink-0 rounded p-2 text-on-surface-variant hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-error"
                  >
                    <Icon name="close" className="text-[18px]" />
                  </button>
                </div>
                <input
                  value={unit.description}
                  onChange={(e) => setUnitField(index, "description", e.target.value)}
                  placeholder="Description for this unit (condition, notes…)"
                  aria-label={`Description for unit ${index + 1}`}
                  className="mt-sm ml-7 h-10 w-[calc(100%-2.75rem)] min-w-0 rounded-lg border border-outline-variant bg-surface-container-lowest px-md text-body-sm focus-ring"
                />
                <select
                  value={unit.attachedToId}
                  onChange={(e) => setUnitField(index, "attachedToId", e.target.value)}
                  aria-label={`Attached to, for unit ${index + 1}`}
                  className="mt-sm ml-7 h-10 w-[calc(100%-2.75rem)] min-w-0 appearance-none rounded-lg border border-outline-variant bg-surface-container-lowest px-md text-body-sm focus-ring"
                >
                  <option value="">NIL — not attached to anything</option>
                  {eligibleParents.map((u) => (
                    <option key={u.id} value={u.id}>
                      Attached to: {itemDisplayName(u)} — {u.serialNumber}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <Button variant="secondary" size="sm" icon="add" onClick={addUnit} className="self-start">
            Add another unit
          </Button>
        </div>

        {/* Image */}
        <div className="flex flex-col gap-xs">
          <span className="text-label-caps uppercase tracking-wider text-on-surface-variant">
            Product Image
          </span>
          {image ? (
            <div className="relative overflow-hidden rounded-lg border border-outline-variant">
              <img src={image} alt="Product preview" className="h-40 w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setImage(null);
                  setImageFile(null);
                }}
                aria-label="Remove image"
                className="absolute right-sm top-sm flex h-8 w-8 items-center justify-center rounded-full bg-on-background/60 text-white hover:bg-on-background/80"
              >
                <Icon name="close" className="text-[18px]" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-sm rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low p-lg text-center hover:bg-surface-container">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-variant text-primary">
                <Icon name={imageBusy ? "hourglass_empty" : "cloud_upload"} />
              </span>
              <span className="text-body-sm text-on-surface">
                {imageBusy ? "Processing…" : "Click to upload"}
              </span>
              <span className="text-body-sm text-on-surface-variant">PNG or JPG</span>
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                disabled={imageBusy}
                onChange={(e) => handleImage(e.target.files?.[0])}
              />
            </label>
          )}
        </div>
      </form>
    </SidePanel>
  );
}
