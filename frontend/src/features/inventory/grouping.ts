import type { Item, ProductGroup, StockStatus } from "@/types";
import { itemDisplayName } from "@/lib/format";

/**
 * Stock status from the number of units held, against the configurable
 * low-stock threshold (Settings). Single source of truth — every screen uses it.
 */
export function statusForUnits(totalUnits: number, lowStockThreshold: number): StockStatus {
  if (totalUnits <= 0) return "out_of_stock";
  if (totalUnits <= lowStockThreshold) return "low_stock";
  return "in_stock";
}

/** Identity of a product: brand + model + category (case-insensitive). */
function groupKey(item: Item): string {
  return [item.brand, item.modelNo ?? "", item.category ?? ""]
    .map((s) => s.trim().toLowerCase())
    .join("|");
}

/**
 * Fold individual unit records into products.
 *
 * Each backend row is one unit (unique serial). A product is every unit sharing
 * brand + model + category. Total units sums quantities so legacy rows (one
 * serial claiming N units) still report honestly — and get flagged.
 */
export function groupItems(items: Item[], lowStockThreshold: number): ProductGroup[] {
  const map = new Map<string, Item[]>();

  for (const item of items) {
    const key = groupKey(item);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }

  const groups: ProductGroup[] = [];

  for (const [key, units] of map) {
    const first = units[0];
    const totalUnits = units.reduce((sum, u) => sum + (u.quantity ?? 0), 0);

    // Unit price: use the first priced unit. Units of the same product should
    // agree; if they don't, the detail panel shows each unit's own price.
    const priced = units.find((u) => u.price != null);
    const unitPrice = priced?.price;

    const totalValue = units.reduce((sum, u) => sum + (u.price ?? 0) * (u.quantity ?? 0), 0);

    groups.push({
      key,
      name: itemDisplayName(first),
      brand: first.brand,
      modelNo: first.modelNo,
      category: first.category,
      units: [...units].sort((a, b) => a.serialNumber.localeCompare(b.serialNumber)),
      totalUnits,
      unitPrice,
      totalValue,
      status: statusForUnits(totalUnits, lowStockThreshold),
      hasLegacyRows: units.some((u) => (u.quantity ?? 0) > 1),
      updatedAt: units.reduce((latest, u) => (u.updatedAt > latest ? u.updatedAt : latest), ""),
    });
  }

  return groups;
}
