from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_admin
from app.database import get_db
from app.models import Product, User
from app.schemas import CategoryOut, CategoryRename

router = APIRouter(prefix="/categories", tags=["categories"])

# A category is currently just a string on a product — there is no categories
# table — so these endpoints operate on the products that carry the name.
#
# FOLLOW-UP: the image_url work needs a migration anyway; consider promoting
# categories to a real table (id, name) with an FK from products at the same
# time. That would let an empty category exist, stop "Cables" vs "cables"
# duplicates at the DB level, and make DELETE meaningful.


@router.get("", response_model=list[CategoryOut])
def list_categories(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Distinct categories with unit counts and total value."""
    rows = (
        db.query(
            Product.category.label("name"),
            func.count(Product.id).label("units"),
            func.coalesce(func.sum(Product.price), 0).label("total_value"),
        )
        .filter(Product.category.isnot(None), Product.category != "")
        .group_by(Product.category)
        .order_by(Product.category)
        .all()
    )
    return [
        CategoryOut(name=r.name, units=int(r.units), total_value=float(r.total_value))
        for r in rows
    ]


@router.patch("/{name}", response_model=CategoryOut)
def rename_category(
    name: str,
    payload: CategoryRename,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Rename a category across every product that carries it."""
    new_name = payload.new_name.strip()

    products = db.query(Product).filter(Product.category == name).all()
    if not products:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    if new_name.lower() != name.lower():
        clash = db.query(Product).filter(func.lower(Product.category) == new_name.lower()).first()
        if clash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A category with that name already exists",
            )

    for product in products:
        product.category = new_name
    db.commit()

    total_value = sum(float(p.price) if p.price is not None else 0.0 for p in products)
    return CategoryOut(name=new_name, units=len(products), total_value=total_value)


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    name: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Clear a category from its products. The products themselves are kept —
    deleting a category must never delete stock."""
    products = db.query(Product).filter(Product.category == name).all()
    if not products:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    for product in products:
        product.category = None
    db.commit()
    return None
