from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_admin
from app.database import get_db
from app.models import AppSettings, User
from app.schemas import AppSettingsOut, AppSettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])

# The migration seeds exactly one row, but get-or-create here too: a test DB
# built via Base.metadata.create_all() (schema only, no data migration) would
# otherwise have the table but no row.


def _row(db: Session) -> AppSettings:
    row = db.query(AppSettings).first()
    if row is None:
        row = AppSettings(low_stock_threshold=10)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


@router.get("", response_model=AppSettingsOut)
def get_settings(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Any signed-in user can READ the org-wide threshold — they need it to
    understand why something shows as Low Stock — but only an admin can
    change it (see PATCH below)."""
    return _row(db)


@router.patch("", response_model=AppSettingsOut)
def update_settings(
    payload: AppSettingsUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    row = _row(db)
    row.low_stock_threshold = payload.low_stock_threshold
    db.commit()
    db.refresh(row)
    return row
