"""Cloudinary integration for product images.

Images are uploaded to Cloudinary and only the resulting public URL + product id are stored on 
the product row. And this  can only be performed 
by  admin only; the delivered/generated URLs are 
public so anyone who is signed-in as viewer can 
see them.
"""
import io

import cloudinary
import cloudinary.uploader

from app.config import settings

# Content types we accept for product images.
ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp"}
# Reject anything larger than this before it reaches Cloudinary (bytes).
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB

# Folder every product image lands in, inside your Cloudinary media library.
_FOLDER = "bitvault/products"

cloudinary.config(
    cloud_name=settings.cloudinary_cloud_name,
    api_key=settings.cloudinary_api_key,
    api_secret=settings.cloudinary_api_secret,
    secure=True,
)


def is_configured() -> bool:
    """True once the three Cloudinary credentials are present in the env."""
    return bool(
        settings.cloudinary_cloud_name
        and settings.cloudinary_api_key
        and settings.cloudinary_api_secret
    )


def upload_product_image(data: bytes, product_id: int) -> dict:
    """Upload (or overwrite) a product's image.

    Uses a deterministic public_id per product so re-uploading replaces the old
    asset instead of piling up orphans. Cloudinary caps the stored image at
    1024px and applies automatic quality on the way in.
    """
    return cloudinary.uploader.upload(
        io.BytesIO(data),
        folder=_FOLDER,
        public_id=str(product_id),
        overwrite=True,
        invalidate=True,
        resource_type="image",
        transformation=[
            {"width": 1024, "height": 1024, "crop": "limit"},
            {"quality": "auto"},
        ],
    )


def delete_product_image(public_id: str) -> None:
    """Remove an asset from Cloudinary. Best-effort — callers ignore failures."""
    cloudinary.uploader.destroy(public_id, resource_type="image", invalidate=True)