# BitVault — Engineering & Design Decisions

Running log of judgment calls, deviations from the mockups, and things to plan
for. Skim this before touching the design system or API layer.

## Naming

- Product name **BitVault** lives in one place: `src/config.ts → APP_NAME`.
  Nothing hardcodes the name. Swap there to rebrand.

## Design system

- **Two design systems were attached; we use one.** The rendered mockups all use
  the InvenTrack/indigo system (`#4f46e5`, Inter, 8px radius). The Kinetic system
  (blue `#0066ff`, Inter+Geist) was NOT used — it doesn't match any screenshot.
  If you want Kinetic instead, it's a `tailwind.config.ts` token swap.
- **Tokens beat prose.** The DESIGN.md narrative contradicts its own token values
  in places. Where they conflicted, the token values won:
  - Prose says canvas is `#F9FAFB`; token is `#fcf8ff` → used `#fcf8ff`.
  - Prose says "no leading/trailing icons on inputs" but the mockups show search
    and currency-prefix icons → we keep icons where they aid scanning.
  - Prose says "outline (Lucide/Feather) icons only" but the mockups load Material
    Symbols → we standardized on **Material Symbols Outlined** (already linked in
    every mockup) to avoid adding an icon dependency.
- Status label normalization: mockups use inconsistent labels ("Critical Low",
  "Reorder Point", "Low Stock"). We normalize to **3 canonical states** —
  `in_stock` / `low_stock` / `out_of_stock` — derived from quantity thresholds.
  Confirm the real thresholds with the backend.

## Copy / placeholders that still need real values

- Login left-panel headline & tagline (currently sensible placeholders).
- Category list — mock categories are guesses; real list comes from `/categories`.
- Stock thresholds for low/out-of-stock (currently ≤0 = out, ≤10 = low).

## Architecture

- **API abstraction (`src/api`)** is the only layer that knows the backend.
  Components depend on the `AuthService`/`ItemsService` interfaces, not impls.
  - `src/api/http/*` — real backend (endpoint paths are ASSUMPTIONS).
  - `src/api/mock/*` — in-memory dev data, gated by `VITE_USE_MOCK_API`.
  - `src/api/index.ts` — the single switch.
- **Types (`src/types`)** are inferred from the screens and marked with
  `// assumption:` where speculative. Reconcile with the real contract here.

## Backend integration (live: https://bitnob-inventory.onrender.com)

Reconciled against the real OpenAPI contract. The entity is **Product** on the
backend; the frontend calls it **Item** and the api layer maps between them
(`src/api/http/mappers.ts`). Key mappings & gaps:

| Frontend (Item)        | Backend (Product)         | Notes |
|------------------------|---------------------------|-------|
| `serialNumber`         | `serial_number`           | acts as SKU |
| `brand` + `modelNo`    | `brand`, `model_no`       | there is **no `name`** field; display name = brand + model |
| `category`             | `category` (string, open) | free text; filter via `?category=` |
| `quantity`             | `quantity`                | |
| `price` + `currency`   | `price` (bare number)     | no currency on backend; display currency = **NGN** (config, assumption) |
| `status`              | — (derived)                | client-derived from quantity (≤0 out, ≤10 low) |
| `id` (string)          | `id` (int)                | coerced at the boundary |
| — (dropped)            | —                         | mockups had **location / image** — backend has neither, so removed |

- **Roles**: backend `is_admin: boolean` → mapped to `role: 'admin' | 'staff'`.
- **Auth**: `POST /auth/login` returns only a token; we chain `GET /auth/me` to
  hydrate the user. **No logout endpoint** → logout is client-side. **No
  password-reset endpoint** → "Forgot password" shows a "contact admin" hint.
- **Pagination**: backend `GET /products` returns a plain array. Pagination +
  status filtering are done client-side in the adapter. **Flag:** ask backend
  for real pagination + a `/products/summary` endpoint before the catalog grows
  (we currently fetch all products to compute summary/categories).
- **AI search**: `POST /search {query}` → `{answer, matched_products}`, surfaced
  via the "Ask AI" dialog. ⚠️ The endpoint currently returns **500** server-side
  — UI degrades gracefully; backend dev needs to fix it.
- **Slack**: `/slack/events` exists but is intentionally untouched.

### Blockers / needs from backend dev
1. **Admin password** — `mremmatola@gmail.com` is already registered, so
   `/auth/register` rejects it and there's no reset endpoint. Need the password
   he set (or have him reset it / promote a fresh account) to test admin CRUD.
2. **`POST /search` 500s** — AI search unusable until fixed.
3. Confirm **currency is NGN** and the **low-stock threshold** (assumed ≤10).

## Deviations from the mockups

- **One role-adaptive Inventory page, not two.** The mockups show a separate
  "Staff Dashboard" (read) and "Admin Dashboard" (write). Building two near-
  identical pages would duplicate the table/filters/stats. Instead `InventoryPage`
  adapts by role: staff get browse/search/filter/detail; admins additionally get
  the Add button, an Actions column, and edit/delete — all via `<RoleGate>`. Both
  `/` and the admin `/inventory` route render it; `/inventory` is additionally
  hard-gated by `<RequireRole role="admin">`.
- **Stats come from a `summary()` endpoint**, not hardcoded and not derived from
  one page of the list (which would be wrong once paginated). Mock computes it;
  real backend should expose `GET /items/summary`.
- **Status labels normalized** to In Stock / Low Stock / Out of Stock (mockups
  mixed in "Critical Low" / "Reorder Point").
- **Image upload is UI-only**, disabled with an explanatory note — persisting a
  file needs a storage endpoint we don't have yet.

## To plan for later (flagged, NOT built yet)

- **Pagination**: list API + UI already accept page/pageSize; wire real totals
  once the backend paginates. Mock already paginates.
- **Optimistic UI** on delete/edit: TanStack Query mutations make this a small
  add; hold until UX is confirmed to avoid rollback complexity now.
- **Auth token expiry / refresh**: `AuthSession.expiresAt` is modeled; a refresh
  interceptor in `http.ts` is the place to add it when the backend supports it.
- **Real image upload**: the Add/Edit form has an upload zone; needs a storage
  endpoint. Currently accepts a URL/null.

## Demo credentials (mock mode only)

- Admin: `admin@bitnob.com` / `admin123`
- Staff: `staff@bitnob.com` / `staff123`
