import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { SidePanel } from "@/components/SidePanel";
import { Button } from "@/components/Button";
import { InputField, TextareaField } from "@/components/FormField";
import { ApiError } from "@/api";
import { useSettings } from "@/settings/SettingsContext";
import type { Item } from "@/types";
import { useUpdateItem } from "./hooks";

interface UnitFormPanelProps {
  open: boolean;
  onClose: () => void;
  unit: Item | null;
  knownCategories: string[];
}

/**
 * Edit ONE unit. Its serial number is its product ID, so it's editable but
 * called out — changing it re-identifies the physical device.
 */
export function UnitFormPanel({ open, onClose, unit, knownCategories }: UnitFormPanelProps) {
  const { settings } = useSettings();
  const updateItem = useUpdateItem();

  const [serialNumber, setSerialNumber] = useState("");
  const [brand, setBrand] = useState("");
  const [modelNo, setModelNo] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !unit) return;
    setSerialNumber(unit.serialNumber);
    setBrand(unit.brand);
    setModelNo(unit.modelNo ?? "");
    setCategory(unit.category ?? "");
    setPrice(unit.price != null ? String(unit.price) : "");
    setQuantity(String(unit.quantity ?? 1));
    setDescription(unit.description ?? "");
    setError(null);
  }, [open, unit]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!unit) return;
    setError(null);

    if (!serialNumber.trim()) return setError("Serial number is required.");
    if (!brand.trim()) return setError("Brand is required.");

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 0) return setError("Quantity must be a whole number ≥ 0.");

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
          quantity: qty,
          price: priceValue,
        },
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save. Please try again.");
    }
  }

  const formId = "unit-form";
  const isLegacy = (unit?.quantity ?? 1) > 1;

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

        {isLegacy && (
          <div className="rounded-lg border border-status-warning-fg/30 bg-status-warning-bg px-md py-sm text-body-sm text-status-warning-fg">
            This record uses one serial number for <strong>{unit?.quantity} units</strong>. Set the
            quantity to 1 and add the remaining units individually so each has its own product ID.
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

        <div className="grid grid-cols-2 gap-md">
          <InputField
            label={`Unit Price (${settings.currency})`}
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <InputField
            label="Quantity"
            type="number"
            min={0}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>

        <TextareaField
          label="Description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </form>
    </SidePanel>
  );
}
