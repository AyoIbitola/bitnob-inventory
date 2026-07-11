/**
 * Domain types for BitVault, reconciled against the live backend
 * (Office Hardware Inventory API, /openapi.json).
 *
 * The frontend calls the entity an "Item"; the backend calls it a "Product".
 * The api layer maps between them (src/api/http/itemsService.ts). Fields that
 * are frontend-only (derived, not persisted) are marked below.
 */

/** Backend models roles as `is_admin: boolean`; we map to a role string. */
export type Role = "admin" | "staff";

export interface User {
  id: string;
  email: string;
  /** Backend has no name field — we display the email (or its local part). */
  name: string;
  role: Role;
  initials?: string;
  createdAt?: string;
}

/**
 * Stock status is NOT stored by the backend. Derived client-side from the
 * number of UNITS a product has, against a threshold configurable in Settings.
 */
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

/**
 * A single physical UNIT of stock.
 *
 * The backend enforces `serial_number` UNIQUE and has DROPPED `quantity`
 * entirely — so one row is exactly one physical unit, and its serial IS that
 * unit's product ID. Stock level = how many unit rows a product has.
 */
export interface Item {
  /** Frontend keeps ids as strings; backend uses integers (mapped at boundary). */
  id: string;
  /** Backend `serial_number` — this unit's unique product ID. */
  serialNumber: string;
  brand: string;
  /** Backend `model_no`. */
  modelNo?: string;
  category?: string;
  description?: string;
  /** Backend `price` — the UNIT price (nullable bare number, no currency). */
  price?: number;
  createdAt?: string;
  updatedAt: string;
}

/**
 * A PRODUCT — i.e. a model of hardware (brand + model + category), composed of
 * the individual units that belong to it. This is what the inventory table
 * lists; drilling in reveals each unit and its serial/product ID.
 *
 * Purely a client-side aggregation: the backend has no product/group concept.
 */
export interface ProductGroup {
  /** Stable identity: brand|model|category. */
  key: string;
  name: string;
  brand: string;
  modelNo?: string;
  category?: string;
  /** The individual unit records making up this product. */
  units: Item[];
  /** Stock level = how many units exist (one row per unit). */
  totalUnits: number;
  /** Unit price (from the units; undefined if none priced). */
  unitPrice?: number;
  /** Sum of every unit's price — the overall value held in this product. */
  totalValue: number;
  status: StockStatus;
  /** Most recently updated unit. */
  updatedAt: string;
}

/** Create/update payload for ONE unit. Maps to ProductCreate / ProductUpdate. */
export interface ItemInput {
  serialNumber: string;
  brand: string;
  modelNo?: string;
  category?: string;
  description?: string;
  price?: number;
}

/**
 * Backend `GET /products` supports `category` and `q` (text) only. Status and
 * pagination are applied client-side in the api adapter (the backend returns a
 * plain array). Confirm before relying on this at scale — flagged in notes.
 */
export interface ItemQuery {
  search?: string;
  category?: string;
  status?: StockStatus;
  page?: number;
  pageSize?: number;
}

/** UI-side pagination envelope (backend doesn't paginate; adapter fills this). */
export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

/** Category is just a distinct string on products; id === name here. */
export interface Category {
  id: string;
  name: string;
}

/**
 * Dashboard metrics. No backend endpoint exists, so the adapter derives these
 * from the full product list. A dedicated endpoint would be better as the
 * catalog grows — flagged in DESIGN-NOTES.
 */
export interface InventorySummary {
  totalItems: number;
  totalValue: number;
  currency: string;
  lowStock: number;
  outOfStock: number;
}

/** AI search (POST /search) → natural-language answer + matched products. */
export interface AiSearchResult {
  answer: string;
  items: Item[];
}

export interface Credentials {
  email: string;
  password: string;
}

export interface AuthSession {
  user: User;
  token: string;
  /** epoch ms; decoded from the JWT `exp` when available. */
  expiresAt?: number;
}
