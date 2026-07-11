import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { SidePanel } from "@/components/SidePanel";
import { Button } from "@/components/Button";
import { InputField, TextareaField } from "@/components/FormField";
import { ApiError } from "@/api";
import { useToast } from "@/components/Toast";
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
  const { toast } = useToast();
  const updateItem = useUpdateItem();

  const [serialNumber, setSerialNumber] = useState("");
  const [brand, setBrand] = useState("");
  const [modelNo, setModelNo] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !unit) return;
    setSerialNumber(unit.serialNumber);
    setBrand(unit.brand);
    setModelNo(unit.modelNo ?? "");
    setCategory(unit.category ?? "");
    setPrice(unit.price != null ? String(unit.price) : "");
    setDescription(unit.description ?? "");
    setError(null);
  }, [open, unit]);

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
          label={`Unit Price (${settings.currency})`}
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
      </form>
    </SidePanel>
  );
}
