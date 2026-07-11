import { SidePanel } from "@/components/SidePanel";
import { Button } from "@/components/Button";
import { Badge, StatusBadge } from "@/components/Badge";
import { Icon } from "@/components/Icon";
import { RoleGate } from "@/auth/guards";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import { imageStore } from "@/lib/imageStore";
import type { Item, ProductGroup } from "@/types";

interface ProductDetailPanelProps {
  group: ProductGroup | null;
  open: boolean;
  onClose: () => void;
  onEditUnit: (unit: Item) => void;
  onDeleteUnit: (unit: Item) => void;
  onAddUnits: (group: ProductGroup) => void;
}

/**
 * Product detail: summary of the model, then EVERY individual unit with its own
 * serial number (product ID) — which is the whole point of the unit-level model.
 * Admins can edit/delete each unit and add more units of this product.
 */
export function ProductDetailPanel({
  group,
  open,
  onClose,
  onEditUnit,
  onDeleteUnit,
  onAddUnits,
}: ProductDetailPanelProps) {
  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Product Details"
      footer={
        group && (
          <RoleGate role="admin">
            <Button icon="add" fullWidth onClick={() => onAddUnits(group)}>
              Add Units
            </Button>
          </RoleGate>
        )
      }
    >
      {!group ? (
        <p className="py-xl text-center text-on-surface-variant">Product not found.</p>
      ) : (
        <div>
          {/* Identity */}
          <div className="mb-lg flex flex-col items-center text-center">
            <div className="mb-md flex h-[110px] w-[110px] items-center justify-center overflow-hidden rounded-lg border border-outline-variant bg-surface-container">
              {imageStore.get(group.units[0]?.id ?? "") ? (
                <img
                  src={imageStore.get(group.units[0].id) as string}
                  alt={group.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Icon name="inventory_2" className="text-5xl text-outline-variant" />
              )}
            </div>
            <h3 className="text-headline-sm font-bold text-on-surface">{group.name}</h3>
            {group.category && (
              <div className="mt-sm">
                <Badge>{group.category}</Badge>
              </div>
            )}
            <div className="mt-sm">
              <StatusBadge status={group.status} dot />
            </div>
          </div>

          {/* Rollup */}
          <dl className="mb-xl grid grid-cols-2 gap-sm">
            <Stat label="Total Units" value={formatNumber(group.totalUnits)} />
            <Stat label="Unit Price" value={formatPrice(group.unitPrice)} />
            <Stat label="Total Value" value={formatPrice(group.totalValue)} />
            <Stat label="Last Updated" value={formatDate(group.updatedAt)} />
          </dl>

          {/* The units */}
          <h4 className="mb-sm flex items-center justify-between text-label-caps uppercase tracking-wider text-on-surface-variant">
            <span>Units ({group.units.length})</span>
          </h4>

          {/* Each unit shows its OWN description. Previously the panel rendered
              units[0].description as a single "product description", which hid
              every other unit's notes — condition/notes differ per device. */}
          <ul className="divide-y divide-outline-variant overflow-hidden rounded-lg border border-outline-variant">
            {group.units.map((unit) => (
              <li key={unit.id} className="px-md py-sm hover:bg-surface-container-low">
                <div className="flex items-start justify-between gap-md">
                  <div className="min-w-0">
                    <code className="block truncate text-body-sm font-semibold text-on-surface">
                      {unit.serialNumber}
                    </code>
                    <span className="text-body-sm text-on-surface-variant">
                      {formatPrice(unit.price)}
                    </span>
                  </div>
                  <RoleGate role="admin">
                    <div className="flex flex-shrink-0 gap-sm">
                      <button
                        type="button"
                        aria-label={`Edit unit ${unit.serialNumber}`}
                        onClick={() => onEditUnit(unit)}
                        className="rounded p-1 text-on-surface-variant hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                      >
                        <Icon name="edit" className="text-[20px]" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete unit ${unit.serialNumber}`}
                        onClick={() => onDeleteUnit(unit)}
                        className="rounded p-1 text-on-surface-variant hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-error"
                      >
                        <Icon name="delete" className="text-[20px]" />
                      </button>
                    </div>
                  </RoleGate>
                </div>

                {unit.description ? (
                  <p className="mt-xs whitespace-pre-wrap text-body-sm leading-relaxed text-on-surface-variant">
                    {unit.description}
                  </p>
                ) : (
                  <p className="mt-xs text-body-sm italic text-on-surface-variant/60">
                    No description for this unit.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </SidePanel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm">
      <dt className="truncate text-label-caps uppercase tracking-wider text-on-surface-variant">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-body-md font-semibold tabular-nums text-on-surface" title={value}>
        {value}
      </dd>
    </div>
  );
}
