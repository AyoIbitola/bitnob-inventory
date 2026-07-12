import type {
  AiSearchResult,
  AuthSession,
  CategoryEntry,
  CategoryInput,
  CategoryUpdateInput,
  Credentials,
  Item,
  ItemInput,
  User,
} from "@/types";

/**
 * Service contracts. Components and hooks depend on THESE interfaces, never on
 * a concrete implementation. The mock and HTTP backends both satisfy them, so
 * switching is a one-line change in api/index.ts.
 */

export interface AuthService {
  login(credentials: Credentials): Promise<AuthSession>;
  logout(): Promise<void>;
  /** Restore a session from a persisted token (e.g. on app boot). */
  restore(token: string): Promise<AuthSession>;
  /** Create an account. Returns the created (always non-admin) user; does NOT
   *  sign anyone in — the caller decides (self-signup logs in, admin does not). */
  register(credentials: Credentials): Promise<User>;
  /** Change your own password (requires the current one). */
  changePassword(input: { currentPassword: string; newPassword: string }): Promise<void>;
}

export interface ItemsService {
  /**
   * All unit records. The backend returns a plain array (no pagination), so we
   * fetch once and derive grouping/filtering/paging/summary client-side. When
   * the backend adds pagination + server search, narrow this signature.
   */
  list(): Promise<Item[]>;
  get(id: string): Promise<Item>;
  create(input: ItemInput): Promise<Item>;
  update(id: string, input: Partial<ItemInput>): Promise<Item>;
  remove(id: string): Promise<void>;
  /** AI-powered natural-language search (POST /search). */
  aiSearch(query: string): Promise<AiSearchResult>;
  /** Upload a unit's image (multipart). Returns the updated item with imageUrl. */
  uploadImage(id: string, file: File): Promise<Item>;
  /** Remove a unit's image (also deletes the hosted asset). */
  removeImage(id: string): Promise<Item>;
}

export interface CategoriesService {
  /** Every category name that exists (from a product OR its own metadata row). */
  list(): Promise<CategoryEntry[]>;
  /** Create a category that can exist before anything is stocked under it. */
  create(input: CategoryInput): Promise<CategoryEntry>;
  /** Rename and/or edit a description. Renaming updates every product that carries it. */
  update(name: string, input: CategoryUpdateInput): Promise<CategoryEntry>;
  /** Clears the category from its products (stock is kept) and removes its metadata. */
  remove(name: string): Promise<void>;
  /** Set the category's representative image (multipart). */
  uploadImage(name: string, file: File): Promise<CategoryEntry>;
  removeImage(name: string): Promise<CategoryEntry>;
}

export interface UsersService {
  list(): Promise<User[]>;
  /** Promote/demote a user's admin flag. Admin-only on the backend. */
  setAdmin(id: string, isAdmin: boolean): Promise<User>;
  /** Admin resets someone's password — the recovery path for a forgotten one. */
  resetPassword(id: string, newPassword: string): Promise<void>;
  /** Admin removes an account (offboarding, or scrubbing old external accounts). */
  remove(id: string): Promise<void>;
}
