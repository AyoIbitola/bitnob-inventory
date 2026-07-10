from fastapi import FastAPI

from app.auth.router import router as auth_router
from app.products.router import router as products_router
from app.search.router import router as search_router
from app.slack.router import router as slack_router

app = FastAPI(title="Office Hardware Inventory API")

app.include_router(auth_router)
app.include_router(products_router)
app.include_router(search_router)
app.include_router(slack_router)


@app.get("/")
def root():
    return {"status": "ok"}
