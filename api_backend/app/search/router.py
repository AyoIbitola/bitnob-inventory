from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import SearchRequest, SearchResponse
from app.search.gemini_client import run_inventory_search

router = APIRouter()


@router.post("/search", response_model=SearchResponse)
def search(
    payload: SearchRequest,
    db: Session = Depends(get_db),
):
    return run_inventory_search(payload.query, db)
