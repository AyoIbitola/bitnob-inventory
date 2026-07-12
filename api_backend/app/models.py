from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text

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
    price = Column(Numeric(10, 2), nullable=True)
    # Images live on Cloudinary; we store the public secure URL served to every
    # viewer, plus Cloudinary's asset id so the image can be replaced/deleted.
    # Both stay null until an admin uploads one.
    image_url = Column(String(500), nullable=True)
    image_public_id = Column(String(255), nullable=True)
    # Accessories (e.g. a mouse bundled with a desktop) point at the unit they
    # ship with. ON DELETE SET NULL: deleting the parent unit must not cascade
    # into deleting the accessory, just orphan the pointer.
    attached_to_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)
