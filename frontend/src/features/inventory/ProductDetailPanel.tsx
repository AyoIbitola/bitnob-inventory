import { SidePanel } from "@/components/SidePanel";
import { Button } from "@/components/Button";
import { Badge, StatusBadge } from "@/components/Badge";
import { Icon } from "@/components/Icon";
import { RoleGate } from "@/auth/guards";
import { formatDate, formatNumber, formatPrice, itemDisplayName } from "@/lib/format";
import { resolveGroupImage, resolveUnitImage } from "@/lib/imageStore";
import type { Item, ProductGroup } from "@/types";

interface ProductDetailPanelProps {
  group: ProductGroup | null;
  /** Full catalog — used to resolve an "attached to" unit's display name. */
  allItems: Item[];
  open: boolean;
  onClose: () => void;
  onViewUnit: (unit: Item) => void;
  onEditUnit: (unit: Item) => void;
  onDeleteUnit: (unit: Item) => void;
  onAddUnits: (group: ProductGroup) => void;
  /** Jump the panel to the product a unit is attached to. */
  onNavigateToParent: (parent: Item) => void;
}

/**
 * Product detail: summary of the model, then EVERY individual unit with its own
 * serial number (product ID) — which is the whole point of the unit-level model.
 * Admins can edit/delete each unit and add more units of this product.
 */
export function ProductDetailPanel({
  group,
  allItems,
  open,
  onClose,
  onViewUnit,
  onEditUnit,
  onDeleteUnit,
  onAddUnits,
  onNavigateToParent,
}: ProductDetailPanelProps) {
  // Each unit has its own photo (own condition, own upload) — the header
  // shows the first unit's photo as a representative thumbnail for the
  // group. Every unit's own photo is still shown in its own row below.
  const productImage = group ? resolveGroupImage(group.units) : null;

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
              {productImage ? (
                <img
                  src={productImage}
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

          {/* Each unit shows its OWN photo, description and added-date — not the
              group's. Click a row for the full read-only view (UnitDetailPanel);
              the edit/delete icons and the attached-to link stop propagation so
              they don't also trigger that. */}
          <ul className="divide-y divide-outline-variant overflow-hidden rounded-lg border border-outline-variant">
            {group.units.map((unit) => {
              const unitImage = resolveUnitImage(unit);
              const parent = unit.attachedToId
                ? allItems.find((i) => i.id === unit.attachedToId)
                : undefined;

              return (
                <li
                  key={unit.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onViewUnit(unit)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onViewUnit(unit);
                    }
                  }}
                  className="cursor-pointer px-md py-sm hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-inset"
                >
                  <div className="flex items-start justify-between gap-md">
                    <div className="flex min-w-0 items-center gap-sm">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-surface-variant">
                        {unitImage ? (
                          <img src={unitImage} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Icon name="inventory_2" className="text-[16px] text-on-surface-variant" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <code className="block truncate text-body-sm font-semibold text-on-surface">
                          {unit.serialNumber}
                        </code>
                        <span className="text-body-sm text-on-surface-variant">
                          {formatPrice(unit.price)} · Added {formatDate(unit.createdAt ?? unit.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <RoleGate role="admin">
                      <div className="flex flex-shrink-0 gap-sm">
                        <button
                          type="button"
                          aria-label={`Edit unit ${unit.serialNumber}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditUnit(unit);
                          }}
                          className="rounded p-1 text-on-surface-variant hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                        >
                          <Icon name="edit" className="text-[20px]" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete unit ${unit.serialNumber}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteUnit(unit);
                          }}
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

                  {parent ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToParent(parent);
                      }}
                      className="mt-xs inline-flex items-center gap-1 text-body-sm text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                    >
                      <Icon name="link" className="text-[16px]" />
                      Attached to: {itemDisplayName(parent)} ({parent.serialNumber})
                    </button>
                  ) : (
                    <p className="mt-xs text-body-sm text-on-surface-variant">Attached to: NIL</p>
                  )}
                </li>
              );
            })}
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
