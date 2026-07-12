import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { SidePanel } from "@/components/SidePanel";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { InputField, SelectField, TextareaField } from "@/components/FormField";
import { ApiError } from "@/api";
import { useToast } from "@/components/Toast";
import { CURRENCY } from "@/config";
import { fileToDownscaledDataUrl, imageStore } from "@/lib/imageStore";
import { itemDisplayName } from "@/lib/format";
import type { Item } from "@/types";
import { useRemoveImage, useUpdateItem, useUploadImage } from "./hooks";

interface UnitFormPanelProps {
  open: boolean;
  onClose: () => void;
  unit: Item | null;
  knownCategories: string[];
  /** Full catalog — used to populate the "Attached to" dropdown. */
  allUnits: Item[];
}

/**
 * Edit ONE unit. Its serial number is its product ID, so it's editable but
 * called out — changing it re-identifies the physical device.
 */
export function UnitFormPanel({ open, onClose, unit, knownCategories, allUnits }: UnitFormPanelProps) {
  const { toast } = useToast();
  const updateItem = useUpdateItem();
  const uploadImage = useUploadImage();
  const removeImage = useRemoveImage();

  /** Image already on this unit: the shared Cloudinary URL, else a local stopgap. */
  const [image, setImage] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);

  const [serialNumber, setSerialNumber] = useState("");
  const [brand, setBrand] = useState("");
  const [modelNo, setModelNo] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [attachedToId, setAttachedToId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !unit) return;
    setSerialNumber(unit.serialNumber);
    setBrand(unit.brand);
    setModelNo(unit.modelNo ?? "");
    setCategory(unit.category ?? "");
    setPrice(unit.price != null ? String(unit.price) : "");
    setDescription(unit.description ?? "");
    setAttachedToId(unit.attachedToId ?? "");
    setImage(unit.imageUrl ?? imageStore.get(unit.id));
    setError(null);
  }, [open, unit]);

  // Eligible parents: not itself, and not already an accessory of something
  // else — the backend rejects attachment chains, so mirror that here rather
  // than let the admin pick an option that will just 400 on save.
  const eligibleParents = allUnits.filter((u) => u.id !== unit?.id && !u.attachedToId);

  /**
   * Images are uploaded immediately (the unit already has an id), so an admin
   * can add or replace one on an existing unit without re-saving the whole form.
   */
  async function handleImage(file: File | undefined) {
    if (!file || !unit) return;
    setImageBusy(true);
    setError(null);
    try {
      const saved = await uploadImage.mutateAsync({ id: unit.id, file });
      setImage(saved.imageUrl ?? null);
      toast("Image updated.");
    } catch (err) {
      // No Cloudinary credentials on the server yet -> keep a local copy rather
      // than blocking the admin, and say so plainly.
      if (err instanceof ApiError && err.status === 503) {
        const dataUrl = await fileToDownscaledDataUrl(file);
        imageStore.set(unit.id, dataUrl);
        setImage(dataUrl);
        toast("Image saved on this device only — shared images need Cloudinary set up.", "error");
      } else {
        setError(err instanceof ApiError ? err.message : "Couldn't upload that image.");
      }
    } finally {
      setImageBusy(false);
    }
  }

  async function handleRemoveImage() {
    if (!unit) return;
    setImageBusy(true);
    try {
      if (unit.imageUrl) await removeImage.mutateAsync(unit.id);
      imageStore.remove(unit.id);
      setImage(null);
      toast("Image removed.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't remove that image.");
    } finally {
      setImageBusy(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!unit) return;
    setError(null);

    if (!serialNumber.trim()) return setError("Serial number is required.");
    if (!brand.trim()) return setError("Brand is required.");

    const priceValue = price.trim() === "" ? undefined : Number(price);
    if (priceValue !== undefined && (!Number.isFinite(priceValue) || priceValue < 0))
      return setError("Enter a valid, non-negative unit price.");

    try {
      await updateItem.mutateAsync({
        id: unit.id,
        input: {
          serialNumber: serialNumber.trim(),
          brand: brand.trim(),
          modelNo: modelNo.trim() || undefined,
          category: category.trim() || undefined,
          description: description.trim() || undefined,
          price: priceValue,
          attachedToId: attachedToId || null,
        },
      });
      toast(`Unit ${serialNumber.trim()} updated.`);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save. Please try again.");
    }
  }

  const formId = "unit-form";

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Edit Unit"
      footer={
        <div className="flex w-full items-center justify-end gap-md">
          <Button variant="ghost" onClick={onClose} disabled={updateItem.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={updateItem.isPending}>
            Save Changes
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

        <InputField
          label="Serial Number (Product ID)"
          required
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
        />

        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <InputField
            label="Brand"
            required
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
          <InputField
            label="Model No."
            value={modelNo}
            onChange={(e) => setModelNo(e.target.value)}
          />
        </div>

        <InputField
          label="Category"
          list="known-categories-edit"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <datalist id="known-categories-edit">
          {knownCategories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <InputField
          label={`Unit Price (${CURRENCY})`}
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <TextareaField
          label="Description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <SelectField
          label="Attached To (optional)"
          value={attachedToId}
          onChange={(e) => setAttachedToId(e.target.value)}
        >
          <option value="">NIL — not attached to anything</option>
          {eligibleParents.map((u) => (
            <option key={u.id} value={u.id}>
              {itemDisplayName(u)} — {u.serialNumber}
            </option>
          ))}
        </SelectField>
        <p className="-mt-sm text-body-sm text-on-surface-variant">
          Use this for an accessory that ships with another unit and isn't sold on its own (e.g. a
          mouse bundled with a desktop).
        </p>

        {/* Image — uploaded/removed immediately, since this unit already exists. */}
        <div className="flex flex-col gap-xs">
          <span className="text-label-caps uppercase tracking-wider text-on-surface-variant">
            Unit Image
          </span>

          {image ? (
            <div className="relative overflow-hidden rounded-lg border border-outline-variant">
              <img src={image} alt="Unit" className="h-40 w-full object-cover" />
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
      </form>
    </SidePanel>
  );
}
