import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { SidePanel } from "@/components/SidePanel";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { InputField, TextareaField } from "@/components/FormField";
import { useSettings } from "@/settings/SettingsContext";
import { fileToDownscaledDataUrl, imageStore } from "@/lib/imageStore";
import type { ItemInput, ProductGroup } from "@/types";
import { useCreateUnits } from "./hooks";

interface ProductFormPanelProps {
  open: boolean;
  onClose: () => void;
  /** When set, we're adding MORE units to an existing product. */
  prefill: ProductGroup | null;
  knownCategories: string[];
}

/**
 * Add a product and its units.
 *
 * The backend enforces a UNIQUE serial per row, so one row = one physical unit.
 * This form therefore collects the product's shared details ONCE and then a
 * serial number per unit, creating one record each. That is what gives every
 * unit its own product ID.
 */
export function ProductFormPanel({ open, onClose, prefill, knownCategories }: ProductFormPanelProps) {
  const { settings } = useSettings();
  const createUnits = useCreateUnits();

  const [brand, setBrand] = useState("");
  const [modelNo, setModelNo] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [serials, setSerials] = useState<string[]>([""]);
  const [image, setImage] = useState<string | null>(null);
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
    setDescription(prefill?.units[0]?.description ?? "");
    setSerials([""]);
    setImage(null);
    setError(null);
    setFailures([]);
  }, [open, prefill]);

  function setSerial(index: number, value: string) {
    setSerials((prev) => prev.map((s, i) => (i === index ? value : s)));
  }
  function addSerial() {
    setSerials((prev) => [...prev, ""]);
  }
  function removeSerial(index: number) {
    setSerials((prev) => (prev.length === 1 ? [""] : prev.filter((_, i) => i !== index)));
  }

  /** Paste many serials at once (newline/comma separated). */
  function handlePasteSerials(index: number, text: string) {
    const parts = text
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length <= 1) return false;
    setSerials((prev) => {
      const next = [...prev];
      next.splice(index, 1, ...parts);
      return next;
    });
    return true;
  }

  async function handleImage(file: File | undefined) {
    if (!file) return;
    setImageBusy(true);
    try {
      setImage(await fileToDownscaledDataUrl(file));
    } catch {
      setError("Couldn't process that image.");
    } finally {
      setImageBusy(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFailures([]);

    const cleanSerials = serials.map((s) => s.trim()).filter(Boolean);

    if (!brand.trim()) return setError("Brand is required.");
    if (cleanSerials.length === 0)
      return setError("Add at least one serial number — each unit needs its own.");

    const dupes = cleanSerials.filter((s, i) => cleanSerials.indexOf(s) !== i);
    if (dupes.length) return setError(`Duplicate serial number(s): ${[...new Set(dupes)].join(", ")}`);

    const priceValue = price.trim() === "" ? undefined : Number(price);
    if (priceValue !== undefined && (!Number.isFinite(priceValue) || priceValue < 0))
      return setError("Enter a valid, non-negative unit price.");

    const inputs: ItemInput[] = cleanSerials.map((serialNumber) => ({
      serialNumber,
      brand: brand.trim(),
      modelNo: modelNo.trim() || undefined,
      category: category.trim() || undefined,
      description: description.trim() || undefined,
      quantity: 1, // one row = one physical unit
      price: priceValue,
    }));

    const { created, failed } = await createUnits.mutateAsync(inputs);

    if (image && created[0]) imageStore.set(created[0].id, image);

    if (failed.length) {
      setFailures(failed);
      // Keep only the failed serials so the admin can correct them.
      setSerials(failed.map((f) => f.serialNumber));
      if (created.length === 0) setError("None of the units could be saved.");
      return;
    }
    onClose();
  }

  const unitCount = serials.filter((s) => s.trim()).length;
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
          label={`Unit Price (${settings.currency})`}
          inputMode="decimal"
          placeholder="0.00"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <TextareaField
          label="Description"
          rows={2}
          placeholder="Condition, specs, or notes…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Per-unit serial numbers */}
        <div className="flex flex-col gap-sm">
          <div className="flex items-baseline justify-between">
            <span className="text-label-caps uppercase tracking-wider text-on-surface-variant">
              Serial Numbers · {unitCount} unit{unitCount === 1 ? "" : "s"}
            </span>
          </div>
          <p className="text-body-sm text-on-surface-variant">
            Every physical unit needs its own serial number — that&apos;s its product ID. You can
            paste a whole list at once.
          </p>

          <div className="space-y-sm">
            {serials.map((serial, index) => (
              <div key={index} className="flex items-center gap-sm">
                <span className="w-6 flex-shrink-0 text-right text-body-sm text-on-surface-variant">
                  {index + 1}
                </span>
                <input
                  value={serial}
                  onChange={(e) => setSerial(index, e.target.value)}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData("text");
                    if (handlePasteSerials(index, text)) e.preventDefault();
                  }}
                  placeholder={`e.g. SN-MOUSE-${String(index + 1).padStart(3, "0")}`}
                  aria-label={`Serial number for unit ${index + 1}`}
                  className="h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md text-body-md focus-ring"
                />
                <button
                  type="button"
                  onClick={() => removeSerial(index)}
                  aria-label={`Remove unit ${index + 1}`}
                  className="flex-shrink-0 rounded p-2 text-on-surface-variant hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-error"
                >
                  <Icon name="close" className="text-[18px]" />
                </button>
              </div>
            ))}
          </div>

          <Button variant="secondary" size="sm" icon="add" onClick={addSerial} className="self-start">
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
                onClick={() => setImage(null)}
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
