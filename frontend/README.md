# BitVault — Frontend

Internal inventory management UI for Bitnob. React + TypeScript + Vite + Tailwind,
talking to the FastAPI backend in this repo.

## Quick start

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Dev calls `/api/*`, which the Vite dev server proxies to the backend
(`vite.config.ts` → `VITE_PROXY_TARGET`), avoiding CORS locally.

## Environment

| Var | Where | Purpose |
|-----|-------|---------|
| `VITE_API_BASE_URL` | `.env.development` = `/api`, `.env.production` = backend URL | API base |
| `VITE_PROXY_TARGET` | `.env.development` | backend the dev proxy forwards to |
| `VITE_USE_MOCK_API` | `.env` | `true` serves in-memory mock data (no backend) |

## Scripts

- `npm run dev` — dev server
- `npm run build` — typecheck + production build to `dist/`
- `npm run typecheck` — types only

## Deployment (Vercel)

Root directory is `frontend/`. `vercel.json` contains the **SPA rewrite** — without
it every deep link (`/users`, `/settings`) and page refresh returns 404.

## Domain model (important)

The backend enforces `serial_number` **UNIQUE**, so **one row = one physical unit**
and the serial is that unit's product ID.

- **Item** = one physical unit.
- **ProductGroup** = a model (brand + model + category) — a client-side grouping of
  its units. The table lists products; opening one reveals every unit and its serial.
- Rows with `quantity > 1` are legacy bad data (one serial for many units) and are
  flagged in the UI with a warning.

## Architecture

- `src/api/` — the **only** layer that knows the backend. `services.ts` defines the
  interfaces; `http/` is the real backend (with Product↔Item mappers), `mock/` is
  in-memory. `index.ts` switches on `VITE_USE_MOCK_API`.
- `src/auth/` — auth context + guards (`RequireAuth`, `RequireRole`, `RoleGate`).
- `src/settings/` — user preferences (low-stock threshold, currency, page size).
- `src/notifications/` — polling-based inventory change feed.
- `src/components/` — reusable UI (Table, Modal, SidePanel, Button, Badge…).
- `src/features/` — `auth`, `inventory`, `categories`, `users`, `settings`.
- Design tokens live in `tailwind.config.ts` — no hardcoded hex/px in components.

## Known backend gaps

See `DESIGN-NOTES.md`. Summary:

1. **Open registration** — anyone on the internet can create an account. Should be
   invite-only / domain-restricted / admin-created.
2. **CORS is `*`** — should be pinned to the deployed frontend origin.
3. **`POST /search` returns 500** — AI search is unusable.
4. **No validation** — negative quantity and negative price are accepted.
5. **No categories table** — categories are free-text strings on products.
6. **No pagination / summary endpoints** — the whole catalog is fetched and paged
   client-side. Fine now; won't scale.
7. **No image field** — product images are stored per-browser as a stopgap.
8. **No password reset / profile update endpoints.**
