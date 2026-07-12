from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.database import get_db
from app.media import (
    ALLOWED_IMAGE_TYPES,
    MAX_IMAGE_BYTES,
    delete_category_image,
    is_configured,
    upload_category_image,
)
from app.models import Category, Product, User
from app.schemas import CategoryCreate, CategoryOut, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])

# A category's unit count/value is still DERIVED from the products that carry
# its name (Product.category stays a plain string — see app.models.Category's
# docstring for why). The `categories` table only holds metadata (description,
# image) for a name, and can hold a row for a category with zero products —
# an "empty" category has somewhere to live now, unlike before this table
# existed, when it could only exist transiently in the browser's localStorage.


def _counts_for(db: Session, name: str) -> tuple[int, float]:
    row = (
        db.query(func.count(Product.id), func.coalesce(func.sum(Product.price), 0))
        .filter(Product.category == name)
        .first()
    )
    return int(row[0] or 0), float(row[1] or 0)


def _out(db: Session, category: Category | None, name: str) -> CategoryOut:
    units, total_value = _counts_for(db, name)
    return CategoryOut(
        name=name,
        units=units,
        total_value=total_value,
        description=category.description if category else None,
        image_url=category.image_url if category else None,
    )


@router.get("", response_model=list[CategoryOut])
def list_categories(
    db: Session = Depends(get_db),
):
    """Every category name that exists — either because a product carries it,
    or because it has its own (possibly product-less) row — with counts and
    any stored description/image merged in."""
    product_rows = (
        db.query(
            Product.category.label("name"),
            func.count(Product.id).label("units"),
            func.coalesce(func.sum(Product.price), 0).label("total_value"),
        )
        .filter(Product.category.isnot(None), Product.category != "")
        .group_by(Product.category)
        .all()
    )
    counts = {r.name: (int(r.units), float(r.total_value)) for r in product_rows}
    meta = {c.name: c for c in db.query(Category).all()}

    names = set(counts) | set(meta)
    results = [
        CategoryOut(
            name=name,
            units=counts.get(name, (0, 0.0))[0],
            total_value=counts.get(name, (0, 0.0))[1],
            description=meta[name].description if name in meta else None,
            image_url=meta[name].image_url if name in meta else None,
        )
        for name in names
    ]
    return sorted(results, key=lambda r: r.name.lower())


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Create a category that can exist with zero products — e.g. to set its
    description/image before anything is stocked under it."""
    name = payload.name.strip()
    clash = db.query(Category).filter(func.lower(Category.name) == name.lower()).first()
    product_clash = (
        db.query(Product).filter(func.lower(Product.category) == name.lower()).first()
    )
    if clash or product_clash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A category with that name already exists",
        )

    category = Category(name=name, description=payload.description)
    db.add(category)
    db.commit()
    db.refresh(category)
    return _out(db, category, category.name)


@router.patch("/{name}", response_model=CategoryOut)
def update_category(
    name: str,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Rename and/or edit a category's description. Renaming updates every
    product that carries the old name, matching the previous rename endpoint."""
    updates = payload.model_dump(exclude_unset=True)
    products = db.query(Product).filter(Product.category == name).all()
    category = db.query(Category).filter(Category.name == name).first()
    if not products and not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    target_name = name
    new_name = updates.get("new_name")
    if new_name:
        new_name = new_name.strip()
        if new_name.lower() != name.lower():
            clash = (
                db.query(Product).filter(func.lower(Product.category) == new_name.lower()).first()
            )
            clash_cat = (
                db.query(Category).filter(func.lower(Category.name) == new_name.lower()).first()
            )
            if clash or clash_cat:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A category with that name already exists",
                )
        for product in products:
            product.category = new_name
        target_name = new_name

    if category is None:
        category = Category(name=target_name)
        db.add(category)
    else:
        category.name = target_name

    if "description" in updates:
        category.description = updates["description"]

    db.commit()
    db.refresh(category)
    return _out(db, category, target_name)


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    name: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Clear the category from its products (stock is kept — deleting a
    category must never delete stock) and remove its metadata row/image."""
    products = db.query(Product).filter(Product.category == name).all()
    category = db.query(Category).filter(Category.name == name).first()
    if not products and not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    for product in products:
        product.category = None

    if category:
        if category.image_public_id:
            try:
                delete_category_image(category.image_public_id)
            except Exception:  # noqa: BLE001
                pass
        db.delete(category)

    db.commit()
    return None


@router.post("/{name}/image", response_model=CategoryOut)
async def upload_image(
    name: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Set a category's representative image — one generic photo for the
    whole category, distinct from any individual unit's own photo."""
    if not is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image uploads are not configured.",
        )

    category = db.query(Category).filter(Category.name == name).first()
    if category is None:
        product_exists = db.query(Product).filter(Product.category == name).first()
        if not product_exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        category = Category(name=name)
        db.add(category)
        db.flush()

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image type. Use PNG, JPEG, or WebP.",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file.")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image is too large (max 10 MB).",
        )

    try:
        result = upload_category_image(data, category.id)
    except Exception:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Image upload failed. Please try again.",
        )

    category.image_url = result["secure_url"]
    category.image_public_id = result["public_id"]
    db.commit()
    db.refresh(category)
    return _out(db, category, category.name)


@router.delete("/{name}/image", response_model=CategoryOut)
def remove_image(
    name: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    category = db.query(Category).filter(Category.name == name).first()
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    if category.image_public_id:
        try:
            delete_category_image(category.image_public_id)
        except Exception:  # noqa: BLE001
            pass

    category.image_url = None
    category.image_public_id = None
    db.commit()
    db.refresh(category)
    return _out(db, category, category.name)
