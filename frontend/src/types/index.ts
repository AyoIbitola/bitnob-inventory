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
 * Stock status is NOT stored by the backend. Derived client-side from quantity.
 * Thresholds are a frontend assumption — confirm with the team.
 */
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface Item {
  /** Frontend keeps ids as strings; backend uses integers (mapped at boundary). */
  id: string;
  /** Backend `serial_number`. Unique hardware identifier (acts as SKU). */
  serialNumber: string;
  brand: string;
  /** Backend `model_no`. */
  modelNo?: string;
  category?: string;
  description?: string;
  quantity: number;
  /** Backend `price` — nullable bare number, no currency attached. */
  price?: number;
  /** Display currency, injected from config (not from the backend). */
  currency: string;
  /** Derived client-side from quantity. */
  status: StockStatus;
  /** Cloudinary image-hosted public URL; absent if there is no image. */
  imageUrl?: string;
  createdAt?: string;
  updatedAt: string;
}

/** Create/update payload. Maps to ProductCreate / ProductUpdate. */
export interface ItemInput {
  serialNumber: string;
  brand: string;
  modelNo?: string;
  category?: string;
  description?: string;
  quantity: number;
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
