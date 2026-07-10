from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.schemas import SearchRequest, SearchResponse
from app.search.gemini_client import run_inventory_search

router = APIRouter()


@router.post("/search", response_model=SearchResponse)
def search(
    payload: SearchRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return run_inventory_search(payload.query, db)
