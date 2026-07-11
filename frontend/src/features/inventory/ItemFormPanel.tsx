import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { SidePanel } from "@/components/SidePanel";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { InputField, TextareaField } from "@/components/FormField";
import { ApiError } from "@/api";
import { CURRENCY } from "@/config";
import { fileToDownscaledDataUrl } from "@/lib/imageStore";
import type { Item, ItemInput } from "@/types";
import {
  useCategories,
  useCreateItem,
  useRemoveItemImage,
  useUpdateItem,
  useUploadItemImage,
} from "./hooks";

interface ItemFormPanelProps {
  open: boolean;
  onClose: () => void;
  item: Item | null; // null = create mode
  onSaved?: (item: Item) => void;
}

interface FormState {
  brand: string;
  modelNo: string;
  serialNumber: string;
  category: string;
  quantity: string;
  price: string;
  description: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

const EMPTY: FormState = {
  brand: "",
  modelNo: "",
  serialNumber: "",
  category: "",
  quantity: "1",
  price: "",
  description: "",
};

function fromItem(item: Item | null): FormState {
  if (!item) return EMPTY;
  return {
    brand: item.brand,
    modelNo: item.modelNo ?? "",
    serialNumber: item.serialNumber,
    category: item.category ?? "",
    quantity: String(item.quantity),
    price: item.price != null ? String(item.price) : "",
    description: item.description ?? "",
  };
}

/**
 * Create/Edit form. Same shell + fields for both modes (req #4). Fields mirror
 * the backend ProductCreate/ProductUpdate contract: brand + model + serial
 * number identify the item (there is no single "name" field), plus category,
 * quantity, price. Client validation is a first line; backend is authoritative.
 */
export function ItemFormPanel({ open, onClose, item, onSaved }: ItemFormPanelProps) {
  const isEdit = !!item;
  const { data: categories } = useCategories();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const uploadImage = useUploadItemImage();
  const removeImage = useRemoveItemImage();

  const [form, setForm] = useState<FormState>(fromItem(item));
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  // `image` is the preview shown in the panel; `imageFile` is the pending
  // upload (null when unchanged or cleared). `imageTouched` gates whether we
  // sync to the backend on save.
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageTouched, setImageTouched] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(fromItem(item));
      setErrors({});
      setSubmitError(null);
      setImage(item?.imageUrl ?? null);
      setImageFile(null);
      setImageTouched(false);
    }
  }, [open, item]);

  async function handleImageChange(file: File | undefined) {
    if (!file) return;
    setImageBusy(true);
    try {
      // Cloudinary handles image optimization at its end, so we don't need to downscale 
      // the uploaded imaages
      const dataUrl = await fileToDownscaledDataUrl(file);
      setImage(dataUrl);
      setImageFile(file);
      setImageTouched(true);
    } catch {
      setSubmitError("Couldn't process that image. Try a different file.");
    } finally {
      setImageBusy(false);
    }
  }

  function clearImage() {
    setImage(null);
    setImageFile(null);
    setImageTouched(true);
  }

  const saving =
    createItem.isPending ||
    updateItem.isPending ||
    uploadImage.isPending ||
    removeImage.isPending;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): boolean {
    const next: Errors = {};
    if (!form.brand.trim()) next.brand = "Brand is required.";
    if (!form.serialNumber.trim()) next.serialNumber = "Serial number is required.";
    const qty = Number(form.quantity);
    if (!Number.isInteger(qty) || qty < 0) next.quantity = "Enter a whole number ≥ 0.";
    if (form.price.trim() !== "") {
      const price = Number(form.price);
      if (!Number.isFinite(price) || price < 0) next.price = "Enter a valid price.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    const payload: ItemInput = {
      brand: form.brand.trim(),
      modelNo: form.modelNo.trim() || undefined,
      serialNumber: form.serialNumber.trim(),
      category: form.category.trim() || undefined,
      quantity: Number(form.quantity),
      price: form.price.trim() === "" ? undefined : Number(form.price),
      description: form.description.trim() || undefined,
    };

    try {
      let saved = isEdit
        ? await updateItem.mutateAsync({ id: item.id, input: payload })
        : await createItem.mutateAsync(payload);
      // Sync the image to Cloudinary against the saved item id. Upload needs the
      // id, so it happens after create/update item returns.
      if (imageTouched) {
        if (imageFile) saved = await uploadImage.mutateAsync({ id: saved.id, file: imageFile });
        else saved = await removeImage.mutateAsync(saved.id);
      }
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Couldn't save. Please try again.");
    }
  }

  const formId = "item-form";

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Item" : "Add New Item"}
      footer={
        <div className="flex w-full items-center justify-end gap-md">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {isEdit ? "Save Changes" : "Save Item"}
          </Button>
        </div>
      }
    >
      <form id={formId} className="space-y-lg" onSubmit={handleSubmit} noValidate>
        {submitError && (
          <div
            role="alert"
            className="rounded-lg border border-error-container bg-error-container/50 px-md py-sm text-body-sm text-on-error-container"
          >
            {submitError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-gutter">
          <InputField
            label="Brand"
            placeholder="e.g. Logitech"
            value={form.brand}
            error={errors.brand}
            required
            onChange={(e) => set("brand", e.target.value)}
          />
          <InputField
            label="Model No."
            placeholder="e.g. M185"
            value={form.modelNo}
            onChange={(e) => set("modelNo", e.target.value)}
          />
        </div>

        <InputField
          label="Serial Number"
          placeholder="e.g. SN-MOUSE-001"
          value={form.serialNumber}
          error={errors.serialNumber}
          required
          onChange={(e) => set("serialNumber", e.target.value)}
        />

        <InputField
          label="Category"
          placeholder="e.g. Peripherals"
          list="category-suggestions"
          value={form.category}
          onChange={(e) => set("category", e.target.value)}
        />
        {/* Free-text with suggestions from existing categories — the backend
            treats category as an open string, so we don't force a fixed list. */}
        <datalist id="category-suggestions">
          {categories?.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>

        <div className="grid grid-cols-2 gap-gutter">
          <QuantityStepper
            value={form.quantity}
            error={errors.quantity}
            onChange={(v) => set("quantity", v)}
          />
          <InputField
            label={`Price (${CURRENCY})`}
            inputMode="decimal"
            placeholder="0.00"
            value={form.price}
            error={errors.price}
            onChange={(e) => set("price", e.target.value)}
          />
        </div>

        <TextareaField
          label="Description"
          rows={3}
          placeholder="Condition, specs, or notes…"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />

        {/* Image upload — sent to Cloudinary through the backend on save, so it
            syncs to every viewer (see uploadImage/removeImage in hooks). */}
        <div className="flex flex-col gap-xs">
          <span className="text-label-caps uppercase tracking-wider text-on-surface-variant">
            Item Image
          </span>
          {image ? (
            <div className="relative overflow-hidden rounded-lg border border-outline-variant">
              <img src={image} alt="Item preview" className="h-40 w-full object-cover" />
              <button
                type="button"
                onClick={clearImage}
                className="absolute right-sm top-sm flex h-8 w-8 items-center justify-center rounded-full bg-on-background/60 text-white transition-colors hover:bg-on-background/80"
                aria-label="Remove image"
              >
                <Icon name="close" className="text-[18px]" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-sm rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low p-lg text-center transition-colors hover:bg-surface-container">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-variant text-primary">
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
                onChange={(e) => handleImageChange(e.target.files?.[0])}
              />
            </label>
          )}
        </div>
      </form>
    </SidePanel>
  );
}

function QuantityStepper({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const num = Number(value) || 0;
  return (
    <div className="flex flex-col gap-xs">
      <span className="text-label-caps uppercase tracking-wider text-on-surface-variant">
        Quantity
      </span>
      <div className="flex h-11 overflow-hidden rounded-lg border border-outline-variant">
        <button
          type="button"
          aria-label="Decrease quantity"
          className="border-r border-outline-variant px-md text-on-surface-variant hover:bg-surface-variant/30"
          onClick={() => onChange(String(Math.max(0, num - 1)))}
        >
          <Icon name="remove" className="text-[18px]" />
        </button>
        <input
          type="number"
          min={0}
          aria-label="Quantity"
          className="w-full border-none text-center text-body-md focus:ring-0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          aria-label="Increase quantity"
          className="border-l border-outline-variant px-md text-on-surface-variant hover:bg-surface-variant/30"
          onClick={() => onChange(String(num + 1))}
        >
          <Icon name="add" className="text-[18px]" />
        </button>
      </div>
      {error && (
        <p className="text-body-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
