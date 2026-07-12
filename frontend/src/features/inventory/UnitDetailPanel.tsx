import { SidePanel } from "@/components/SidePanel";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { Icon } from "@/components/Icon";
import { RoleGate } from "@/auth/guards";
import { formatDateTime, formatPrice, itemDisplayName, productIdFor } from "@/lib/format";
import { imageStore } from "@/lib/imageStore";
import type { Item } from "@/types";

interface UnitDetailPanelProps {
  unit: Item | null;
  /** Full catalog — used to resolve the attached-to unit and any accessories of this unit. */
  allItems: Item[];
  open: boolean;
  onClose: () => void;
  onEdit: (unit: Item) => void;
  onDelete: (unit: Item) => void;
  onNavigateToUnit: (unit: Item) => void;
}

/**
 * Read-only view of ONE physical unit — its own photo, its own timestamps,
 * its computed Product ID, and its accessory relationships. This is what
 * "clicking a unit" opens; previously a unit had no view of its own, only
 * inline text in the product's unit list.
 */
export function UnitDetailPanel({
  unit,
  allItems,
  open,
  onClose,
  onEdit,
  onDelete,
  onNavigateToUnit,
}: UnitDetailPanelProps) {
  const image = unit ? (unit.imageUrl ?? imageStore.get(unit.id)) : null;
  const parent = unit?.attachedToId ? allItems.find((i) => i.id === unit.attachedToId) : undefined;
  const accessories = unit ? allItems.filter((i) => i.attachedToId === unit.id) : [];

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Unit Details"
      footer={
        unit && (
          <RoleGate role="admin">
            <div className="flex w-full items-center gap-md">
              <Button
                variant="secondary"
                icon="delete"
                onClick={() => onDelete(unit)}
                className="flex-1"
              >
                Delete
              </Button>
              <Button icon="edit" onClick={() => onEdit(unit)} className="flex-1">
                Edit
              </Button>
            </div>
          </RoleGate>
        )
      }
    >
      {!unit ? (
        <p className="py-xl text-center text-on-surface-variant">Unit not found.</p>
      ) : (
        <div>
          {/* This unit's OWN photo — not borrowed from any other unit. */}
          <div className="mb-lg flex flex-col items-center text-center">
            <div className="mb-md flex h-[140px] w-[140px] items-center justify-center overflow-hidden rounded-lg border border-outline-variant bg-surface-container">
              {image ? (
                <img src={image} alt={unit.serialNumber} className="h-full w-full object-cover" />
              ) : (
                <Icon name="inventory_2" className="text-5xl text-outline-variant" />
              )}
            </div>
            <h3 className="text-headline-sm font-bold text-on-surface">
              {itemDisplayName(unit)}
            </h3>
            {unit.category && (
              <div className="mt-sm">
                <Badge>{unit.category}</Badge>
              </div>
            )}
          </div>

          <dl className="space-y-md">
            <Field label="Product ID" value={productIdFor(unit)} mono />
            <Field label="Serial Number" value={unit.serialNumber} mono />
            <Field label="Unit Price" value={formatPrice(unit.price)} />
            <Field
              label="Description"
              value={unit.description || "No description for this unit."}
              muted={!unit.description}
            />
            <Field label="Added" value={unit.createdAt ? formatDateTime(unit.createdAt) : "—"} />
            <Field label="Last Updated" value={formatDateTime(unit.updatedAt)} />
          </dl>

          {/* Attachment relationships */}
          {parent && (
            <div className="mt-lg">
              <h4 className="mb-sm text-label-caps uppercase tracking-wider text-on-surface-variant">
                Attached To
              </h4>
              <button
                type="button"
                onClick={() => onNavigateToUnit(parent)}
                className="flex w-full items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm text-left hover:bg-surface-container focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
              >
                <span className="min-w-0 truncate text-body-sm font-semibold text-on-surface">
                  {itemDisplayName(parent)} — {parent.serialNumber}
                </span>
                <Icon name="chevron_right" className="flex-shrink-0 text-on-surface-variant" />
              </button>
            </div>
          )}

          {accessories.length > 0 && (
            <div className="mt-lg">
              <h4 className="mb-sm text-label-caps uppercase tracking-wider text-on-surface-variant">
                Accessories ({accessories.length})
              </h4>
              <ul className="divide-y divide-outline-variant overflow-hidden rounded-lg border border-outline-variant">
                {accessories.map((acc) => (
                  <li key={acc.id}>
                    <button
                      type="button"
                      onClick={() => onNavigateToUnit(acc)}
                      className="flex w-full items-center justify-between px-md py-sm text-left hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-inset"
                    >
                      <span className="min-w-0 truncate text-body-sm font-semibold text-on-surface">
                        {itemDisplayName(acc)} — {acc.serialNumber}
                      </span>
                      <Icon name="chevron_right" className="flex-shrink-0 text-on-surface-variant" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </SidePanel>
  );
}

function Field({
  label,
  value,
  mono,
  muted,
}: {
  label: string;
  value: string;
  mono?: boolean;
  muted?: boolean;
}) {
  return (
    <div>
      <dt className="text-label-caps uppercase tracking-wider text-on-surface-variant">{label}</dt>
      <dd
        className={
          mono
            ? "mt-0.5 break-all font-mono text-body-md text-on-surface"
            : `mt-0.5 whitespace-pre-wrap text-body-md text-on-surface ${muted ? "italic text-on-surface-variant/60" : ""}`
        }
      >
        {value}
      </dd>
    </div>
  );
}
