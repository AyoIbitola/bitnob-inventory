from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, Numeric, String, Text

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=_utcnow)


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    serial_number = Column(String(100), unique=True, nullable=False, index=True)
    brand = Column(String(100), nullable=False)
    model_no = Column(String(100))
    category = Column(String(100), index=True)
    description = Column(Text)
    quantity = Column(Integer, default=0, nullable=False)
    price = Column(Numeric(10, 2), nullable=True)
    # Images are hosted on cloudinary with the url set to be public secure URL served to
    # every viewer; `image_public_id` is cloudinary's asset id, kept so we can
    # replace/delete the image (asset) later. Both will be empty (null) until an admin uploads 
    # an image for an item when filling an inventory
    image_url = Column(String(500), nullable=True)
    image_public_id = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)
