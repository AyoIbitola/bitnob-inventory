# Office Hardware Inventory — Backend

FastAPI backend for tracking office hardware inventory: email/password auth (JWT) with admin roles,
CRUD for hardware products, an LLM-powered natural language search endpoint (Gemini), and a Slack bot
that answers inventory questions via the same search pipeline.

Full spec: see `../backend.md`.

## Stack

- FastAPI + Pydantic v2
- SQLAlchemy 2.0 + Alembic (PostgreSQL in production, SQLite fine for local dev)
- JWT auth via `python-jose`, password hashing via `passlib[bcrypt]`
- Google Gemini (`google-generativeai`) for NL search
- Slack Events API (raw `httpx` calls, no Bolt SDK)

## Setup

```bash
cd api_backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-dev.txt   # includes pytest; use requirements.txt if you don't need tests
```

Copy `.env.example` to `.env` and fill in real values:

```bash
cp .env.example .env
```

```
DATABASE_URL=postgresql://user:pass@localhost:5432/inventory
JWT_SECRET=some-long-random-string
JWT_EXPIRE_MINUTES=1440
ADMIN_SEED_EMAILS=you@gmail.com
GEMINI_API_KEY=...
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
```

Notes:
- `DATABASE_URL` accepts either `postgresql://` or the legacy `postgres://` scheme (e.g. from Prisma,
  Heroku) — it's normalized automatically.
- `ADMIN_SEED_EMAILS` is comma-separated. Any email in that list becomes admin automatically on
  `/auth/register`. After that, admin status is managed entirely via the API — the seed list is only
  consulted at registration time.
- For local dev without Postgres, set `DATABASE_URL=sqlite:///./inventory.db`.

## Migrate and run

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

API docs available at `http://127.0.0.1:8000/docs` once running.

## Tests

```bash
pytest tests/
```

Covers the `ADMIN_SEED_EMAILS` bootstrap logic (the only path that creates an admin).

## Project structure

```
app/
  main.py                # FastAPI() instance, includes routers
  config.py               # pydantic-settings loader for env vars
  database.py              # engine, SessionLocal, get_db dependency
  models.py                # User, Product (SQLAlchemy)
  schemas.py                # Pydantic request/response models
  auth/
    utils.py                # hash_password, verify_password, create/decode JWT
    dependencies.py          # get_current_user, require_admin
    router.py                # /auth/*, /users/* endpoints
  products/
    router.py                # /products/* endpoints
  search/
    gemini_client.py          # run_inventory_search(query, db) — importable, used by /search and Slack
    router.py                  # /search endpoint
  slack/
    signature.py                # Slack request signature verification
    router.py                    # /slack/events endpoint
alembic/                # migrations
tests/                  # pytest suite
```

## API summary

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | none | register; seeds admin if email is in `ADMIN_SEED_EMAILS` |
| POST | `/auth/login` | none | returns JWT |
| GET | `/auth/me` | JWT | current user |
| GET | `/users` | admin | list all users |
| PATCH | `/users/{id}/admin` | admin | promote/demote a user |
| GET | `/products` | JWT | list, filter by `?category=` / `?q=` |
| GET | `/products/{id}` | JWT | single product |
| POST | `/products` | admin | create |
| PATCH | `/products/{id}` | admin | update any field |
| DELETE | `/products/{id}` | admin | delete |
| POST | `/search` | JWT | natural-language inventory search (Gemini) |
| POST | `/slack/events` | Slack signature | Events API webhook (`url_verification`, `app_mention`) |

Admin authorization is checked against live DB state on every request (not the JWT's `is_admin`
claim), so promoting/demoting a user takes effect immediately even on tokens issued before the change.

## Slack app setup (one-time, in api.slack.com)

1. Enable Events API, subscribe to the `app_mention` bot event.
2. Add bot scopes: `app_mentions:read`, `chat:write`.
3. Point the Events request URL at `https://<your-domain>/slack/events`.
4. Install the app to your workspace, invite the bot to the relevant channel(s).

## Out of scope (v1)

Stock transaction/audit log, multi-location inventory, purchase orders/suppliers, refresh tokens,
password reset, rate limiting on `/search`. See `../backend.md` section 10.
