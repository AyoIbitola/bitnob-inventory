from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.dependencies import require_admin
from app.auth.router import router as auth_router
from app.categories.router import router as categories_router
from app.config import settings
from app.media import is_configured as cloudinary_configured
from app.models import User
from app.products.router import router as products_router
from app.search.router import router as search_router
from app.settings.router import router as settings_router
from app.slack.router import router as slack_router

app = FastAPI(title="Office Hardware Inventory API")

# Pinned to known origins (ALLOWED_ORIGINS). Was "*", which let any website on
# the internet call this API with a signed-in user's token.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(products_router)
app.include_router(categories_router)
app.include_router(search_router)
app.include_router(settings_router)
app.include_router(slack_router)


@app.get("/")
def root():
    return {"status": "ok"}


@app.get("/health/gemini")
def gemini_probe(_: User = Depends(require_admin)):
    """Actually CALL Gemini and report what happens.

    Search fails soft (falls back to keyword matching), so a broken Gemini setup
    is invisible from the outside — you just get worse results. This surfaces the
    real exception from the running host, which is otherwise only visible in logs.
    Admin-only.
    """
    import google.generativeai as genai

    if not settings.gemini_api_key:
        return {"ok": False, "stage": "config", "error": "GEMINI_API_KEY is empty"}

    try:
        genai.configure(api_key=settings.gemini_api_key)
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "stage": "configure", "error": f"{type(exc).__name__}: {exc}"[:400]}

    try:
        models = [m.name for m in genai.list_models()]
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "stage": "list_models (key rejected?)",
            "error": f"{type(exc).__name__}: {exc}"[:400],
        }

    from app.search import gemini_client

    try:
        reply = gemini_client._model().generate_content("Reply with the single word: OK")
        return {
            "ok": True,
            "reply": reply.text.strip()[:40],
            "models_available": len(models),
            "model_in_use": gemini_client._working_model,
            # The direct call above can succeed while the SEARCH pipeline still
            # fails (e.g. an unsupported GenerationConfig). This is the real
            # error from the last /search request.
            "last_search_error": gemini_client.LAST_ERROR,
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "stage": "generate_content (model name?)",
            "error": f"{type(exc).__name__}: {exc}"[:400],
            "flash_models": [m for m in models if "flash" in m][:8],
        }


@app.get("/health/integrations")
def integrations(_: User = Depends(require_admin)):
    """Which optional integrations are actually configured on THIS deployment.

    Gemini and Cloudinary both fail soft — search silently falls back to keyword
    matching, image upload returns 503 — which is right for users but makes a
    missing/typo'd env var invisible. This lets an admin confirm the keys really
    landed without shell access to the host. Booleans only; never the secrets.
    """
    return {
        "gemini": bool(settings.gemini_api_key),
        "cloudinary": cloudinary_configured(),
        "seed_admins": settings.admin_seed_email_list,
    }
