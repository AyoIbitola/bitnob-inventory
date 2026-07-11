/**
 * App-wide configuration. Values that vary by environment come from Vite env
 * vars (import.meta.env.*) so nothing here is baked into components.
 */

/** Product name — single source of truth. Swap here to rebrand. */
export const APP_NAME = "BitVault";
export const APP_TAGLINE = "Bitnob Inventory Control";

/**
 * Base URL for the backend API (FastAPI, endpoints at the root — no /api prefix).
 * Set VITE_API_BASE_URL in .env; falls back to same-origin for local proxying.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

/**
 * Display currency. The backend `price` is a bare number with no currency
 * field; seeded values are Naira. Change here if that's wrong — it's display
 * only, never sent to the backend.
 */
export const CURRENCY = "NGN";

/**
 * When true, the API layer serves in-memory mock data instead of calling the
 * real backend. Lets us build/preview the whole UI before the API contract is
 * final. Flip via VITE_USE_MOCK_API=false once the backend is wired.
 *
 * NOTE: this is the ONE sanctioned place mock data enters the app, and it is
 * gated behind an env flag — no mock data leaks into production code paths.
 * Defaults to FALSE now that the real backend is wired; opt in explicitly.
 */
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === "true";

/** Default page size for paginated lists. */
export const DEFAULT_PAGE_SIZE = 10;
