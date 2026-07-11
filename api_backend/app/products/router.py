from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_admin
from app.database import get_db
from app.media import (
    ALLOWED_IMAGE_TYPES,
    MAX_IMAGE_BYTES,
    delete_product_image,
    is_configured,
    upload_product_image,
)
from app.models import Product, User
from app.schemas import InventorySummary, ProductCreate, ProductOut, ProductUpdate

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductOut])
def list_products(
    category: str | None = None,
    q: str | None = None,
    # Optional paging. Omit both and you get the full list exactly as before,
    # so this stays backwards-compatible with the current frontend.
    limit: int | None = Query(default=None, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Product)
    if category:
        query = query.filter(Product.category == category)
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                Product.serial_number.ilike(like),
                Product.brand.ilike(like),
                Product.model_no.ilike(like),
                Product.category.ilike(like),
                Product.description.ilike(like),
            )
        )

    query = query.order_by(Product.updated_at.desc())

    if limit is not None:
        query = query.offset(offset).limit(limit)

    return query.all()


# NOTE: must precede "/{product_id}", or "summary" is parsed as an int id and 422s.
@router.get("/summary", response_model=InventorySummary)
def inventory_summary(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Dashboard rollup. One row = one physical unit, so total_units is a row
    count and total_value is the sum of unit prices."""
    total_units = db.query(func.count(Product.id)).scalar() or 0
    total_value = db.query(func.coalesce(func.sum(Product.price), 0)).scalar() or 0
    # Distinct (brand, model) pairs, as a DISTINCT tuple query — func.concat is
    # not implemented by SQLite, which is the local-dev database.
    total_products = db.query(Product.brand, Product.model_no).distinct().count()
    categories = (
        db.query(func.count(func.distinct(Product.category)))
        .filter(Product.category.isnot(None))
        .scalar()
        or 0
    )

    return InventorySummary(
        total_units=int(total_units),
        total_products=int(total_products),
        total_value=float(total_value),
        categories=int(categories),
    )


@router.get("/{product_id}", response_model=ProductOut)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    existing = db.query(Product).filter(Product.serial_number == payload.serial_number).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product with this serial number already exists",
        )

    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    # Don't leave the hosted image orphaned on Cloudinary. Best-effort: a
    # failure here must not block deleting the product itself.
    if product.image_public_id:
        try:
            delete_product_image(product.image_public_id)
        except Exception:  # noqa: BLE001
            pass

    db.delete(product)
    db.commit()
    return None


@router.post("/{product_id}/image", response_model=ProductOut)
async def upload_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Attach an image to a unit. Admin-only; the resulting URL is public so any
    signed-in viewer can see it."""
    if not is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image uploads are not configured.",
        )

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

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
        result = upload_product_image(data, product_id)
    except Exception:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Image upload failed. Please try again.",
        )

    product.image_url = result["secure_url"]
    product.image_public_id = result["public_id"]
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}/image", response_model=ProductOut)
def remove_image(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    if product.image_public_id:
        try:
            delete_product_image(product.image_public_id)
        except Exception:  # noqa: BLE001
            pass

    product.image_url = None
    product.image_public_id = None
    db.commit()
    db.refresh(product)
    return product
