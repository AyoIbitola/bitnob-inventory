from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.categories.router import router as categories_router
from app.config import settings
from app.products.router import router as products_router
from app.search.router import router as search_router
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
app.include_router(slack_router)


@app.get("/")
def root():
    return {"status": "ok"}
