import type {
  AiSearchResult,
  AuthSession,
  Category,
  Credentials,
  InventorySummary,
  Item,
  ItemInput,
  ItemQuery,
  Paginated,
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
}

export interface UsersService {
  list(): Promise<User[]>;
  /** Promote/demote a user's admin flag. Admin-only on the backend. */
  setAdmin(id: string, isAdmin: boolean): Promise<User>;
}

export interface ItemsService {
  list(query: ItemQuery): Promise<Paginated<Item>>;
  get(id: string): Promise<Item>;
  create(input: ItemInput): Promise<Item>;
  update(id: string, input: ItemInput): Promise<Item>;
  remove(id: string): Promise<void>;
  /** When an image is uploaded/replaced, this returns the updated item. */
  uploadImage(id: string, file: File): Promise<Item>;
  /** When an image is removed, this returns the updated item, probably NULL */
  removeImage(id: string): Promise<Item>;
  categories(): Promise<Category[]>;
  summary(): Promise<InventorySummary>;
  /** AI-powered natural-language search (POST /search). */
  aiSearch(query: string): Promise<AiSearchResult>;
}
