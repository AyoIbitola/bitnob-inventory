import json

import google.generativeai as genai
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Product

_configured = False


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
    model = genai.GenerativeModel("gemini-flash-latest")
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
    model = genai.GenerativeModel("gemini-flash-latest")

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


def run_inventory_search(query: str, db: Session) -> dict:
    categories = _get_known_categories(db)
    filters = _extract_filters(query, categories)
    products = _query_products(db, filters)
    answer = _compose_answer(query, products)

    return {
        "answer": answer,
        "matched_products": products,
        "count": len(products),
    }
