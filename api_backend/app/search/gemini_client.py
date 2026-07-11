import json
import logging
import re

import google.generativeai as genai
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Product

logger = logging.getLogger(__name__)

_configured = False

# Last failure from the Gemini path, surfaced by GET /health/gemini. Search
# degrades silently to keyword matching, so without this a broken LLM call is
# invisible unless you can read the host's logs.
LAST_ERROR: dict[str, str] | None = None


def _record_error(stage: str, exc: Exception) -> None:
    global LAST_ERROR
    LAST_ERROR = {"stage": stage, "error": f"{type(exc).__name__}: {exc}"[:500]}
    logger.exception("Gemini failed at %s", stage)

# Carry no signal when falling back to keyword matching.
_STOPWORDS = {
    "a", "all", "an", "and", "any", "are", "do", "does", "find", "for", "get", "have",
    "how", "in", "is", "it", "list", "many", "me", "much", "of", "on", "or", "our",
    "show", "stock", "the", "there", "we", "what", "which", "with",
}


# Pinned deliberately. "gemini-flash-latest" is an ALIAS that currently resolves
# to gemini-3.5-flash, a preview model whose free tier allows only 20 requests a
# DAY. Each search makes two calls (extract filters + compose answer), so search
# silently died into keyword fallback after ~10 queries. gemini-2.0-flash is
# stable and has a far larger free quota.
MODEL_NAME = "gemini-2.0-flash"


def _ensure_configured() -> None:
    global _configured
    if not _configured:
        genai.configure(api_key=settings.gemini_api_key)
        _configured = True


EXTRACT_FILTERS_PROMPT = """You are extracting search filters from a hardware inventory question.
Return ONLY valid JSON, no markdown, no preamble, matching this schema:
{{"keywords": ["string", ...], "category": "string or null"}}

The "category" field, if not null, MUST be exactly one of these existing categories
(copy it verbatim, do not invent, pluralize, or paraphrase a category name):
{categories}

If the question doesn't clearly match one of the categories above, set "category" to null
and rely on "keywords" instead.

Question: "{query}"
"""

COMPOSE_ANSWER_PROMPT = """The user asked: "{query}"
There are exactly {count} matching inventory rows (each row is one physical unit,
identified by its own serial number). Here they are: {rows}

Answer conversationally and concisely. If the question asks how many there are,
state the count as exactly {count} — do not estimate or recompute it yourself.
If there are no rows, say so plainly and don't invent products.
"""


def _get_known_categories(db: Session) -> list[str]:
    rows = db.query(Product.category).filter(Product.category.isnot(None)).distinct().all()
    return sorted({r[0] for r in rows if r[0]})


def _extract_filters(query: str, categories: list[str]) -> dict:
    _ensure_configured()
    model = genai.GenerativeModel(MODEL_NAME)
    categories_text = ", ".join(categories) if categories else "(none yet)"
    response = model.generate_content(
        EXTRACT_FILTERS_PROMPT.format(query=query, categories=categories_text),
        generation_config=genai.GenerationConfig(temperature=0.0),
    )
    text = response.text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        parsed = {}

    keywords = parsed.get("keywords") or []
    category = parsed.get("category") or None

    # Defense in depth: even though the prompt constrains Gemini to known
    # categories, don't let a hallucinated value (e.g. "mice" instead of
    # "Peripherals") silently zero out results via the AND filter below.
    if category and category not in categories:
        category = None

    return {"keywords": [str(k) for k in keywords if k], "category": category}


def _query_products(db: Session, filters: dict) -> list[Product]:
    query = db.query(Product)

    keywords = filters.get("keywords") or []
    if keywords:
        keyword_clauses = []
        for kw in keywords:
            like = f"%{kw}%"
            keyword_clauses.append(
                or_(
                    Product.brand.ilike(like),
                    Product.model_no.ilike(like),
                    Product.category.ilike(like),
                    Product.description.ilike(like),
                )
            )
        query = query.filter(or_(*keyword_clauses))

    category = filters.get("category")
    if category:
        query = query.filter(Product.category.ilike(f"%{category}%"))

    return query.all()


def _compose_answer(query: str, products: list[Product]) -> str:
    _ensure_configured()
    model = genai.GenerativeModel(MODEL_NAME)

    rows = [
        {
            "serial_number": p.serial_number,
            "brand": p.brand,
            "model_no": p.model_no,
            "category": p.category,
            "description": p.description,
        }
        for p in products
    ]

    response = model.generate_content(
        COMPOSE_ANSWER_PROMPT.format(query=query, rows=json.dumps(rows), count=len(rows))
    )
    return response.text.strip()


def _keyword_filters(query: str, categories: list[str]) -> dict:
    """Filters derived without the LLM — used when Gemini is unavailable."""
    words = [w for w in re.split(r"[^\w-]+", query.lower()) if w and w not in _STOPWORDS]
    category = next((c for c in categories if c.lower() in query.lower()), None)
    return {"keywords": words, "category": category}


def _plain_answer(query: str, products: list[Product]) -> str:
    """Deterministic answer used when Gemini is unavailable."""
    if not products:
        return f'No inventory units matched "{query}".'
    if len(products) == 1:
        p = products[0]
        return f'1 unit matched "{query}": {p.brand} {p.model_no or ""}'.strip()
    return f'{len(products)} units matched "{query}".'


def run_inventory_search(query: str, db: Session) -> dict:
    """AI-assisted search that degrades gracefully.

    Previously ANY Gemini failure (missing/invalid key, quota, network, model
    rename, deprecated SDK) propagated and the endpoint returned 500 — search
    was simply dead. The LLM is now best-effort: on failure we fall back to
    keyword matching so the user still gets results.
    """
    categories = _get_known_categories(db)
    ai_available = bool(settings.gemini_api_key)

    filters = None
    if ai_available:
        try:
            filters = _extract_filters(query, categories)
        except Exception as exc:  # noqa: BLE001 - any Gemini/network failure
            _record_error("extract_filters", exc)

    if filters is None:
        filters = _keyword_filters(query, categories)

    products = _query_products(db, filters)

    answer = None
    if ai_available:
        try:
            answer = _compose_answer(query, products)
        except Exception as exc:  # noqa: BLE001
            _record_error("compose_answer", exc)

    if answer is None:
        answer = _plain_answer(query, products)

    return {
        "answer": answer,
        "matched_products": products,
        "count": len(products),
    }
