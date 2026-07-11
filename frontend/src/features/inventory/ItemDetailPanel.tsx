import { SidePanel } from "@/components/SidePanel";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/Badge";
import { Icon } from "@/components/Icon";
import { Spinner } from "@/components/Spinner";
import { RoleGate } from "@/auth/guards";
import { formatDate, formatNumber, formatPrice, itemDisplayName } from "@/lib/format";
import { imageStore } from "@/lib/imageStore";
import type { Item } from "@/types";
import { useItem } from "./hooks";

interface ItemDetailPanelProps {
  itemId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
}

/**
 * Read-only item detail. Edit/Delete are wrapped in <RoleGate role="admin"> —
 * staff never get those controls. Fetches its own data by id.
 */
export function ItemDetailPanel({ itemId, open, onClose, onEdit, onDelete }: ItemDetailPanelProps) {
  const { data: item, isLoading, isError, refetch } = useItem(open ? itemId : null);

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Item Details"
      footer={
        item && (
          <RoleGate role="admin">
            <Button variant="secondary" icon="edit" fullWidth onClick={() => onEdit(item)}>
              Edit
            </Button>
            <Button variant="danger-outline" icon="delete" fullWidth onClick={() => onDelete(item)}>
              Delete
            </Button>
          </RoleGate>
        )
      }
    >
      {isLoading && (
        <div className="flex justify-center py-xl text-primary">
          <Spinner className="h-6 w-6" />
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-sm py-xl text-on-surface-variant">
          <Icon name="error" className="text-error" />
          <p>Couldn&apos;t load this item.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-body-sm font-semibold text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {item && <ItemDetailBody item={item} />}
    </SidePanel>
  );
}

function ItemDetailBody({ item }: { item: Item }) {
  const rows: Array<[string, string]> = [
    ["Brand", item.brand],
    ["Model", item.modelNo ?? "—"],
    ["Category", item.category ?? "—"],
    ["Quantity", `${formatNumber(item.quantity)} units`],
    ["Price", formatPrice(item.price, item.currency)],
    ["Last Updated", formatDate(item.updatedAt)],
  ];

  return (
    <div>
      <div className="mb-xl flex flex-col items-center">
        <div className="mb-md flex h-[120px] w-[120px] items-center justify-center overflow-hidden rounded-lg border border-outline-variant bg-surface-container">
          {imageStore.get(item.id) ? (
            <img
              src={imageStore.get(item.id) as string}
              alt={itemDisplayName(item)}
              className="h-full w-full object-cover"
            />
          ) : (
            <Icon name="inventory_2" className="text-5xl text-outline-variant" />
          )}
        </div>
        <div className="text-center">
          <h3 className="text-headline-sm font-bold text-on-surface">{itemDisplayName(item)}</h3>
          <code className="mt-sm inline-block rounded bg-surface-container-low px-2 py-0.5 text-body-sm text-on-surface-variant">
            {item.serialNumber}
          </code>
        </div>
      </div>

      <div className="mb-lg flex justify-center">
        <StatusBadge status={item.status} dot />
      </div>

      <dl className="mb-xl space-y-1">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between border-b border-outline-variant/30 py-2"
          >
            <dt className="text-label-caps uppercase text-on-surface-variant">{label}</dt>
            <dd className="text-body-md text-on-surface">{value}</dd>
          </div>
        ))}
      </dl>

      {item.description && (
        <div>
          <h4 className="mb-sm text-label-caps uppercase text-on-surface-variant">Description</h4>
          <p className="text-body-sm leading-relaxed text-on-surface-variant">{item.description}</p>
        </div>
      )}
    </div>
  );
}
