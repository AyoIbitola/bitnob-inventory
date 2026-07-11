import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Deliberately not pydantic's EmailStr, which would add an `email-validator`
# dependency. This keeps the dependency set unchanged.
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

MIN_PASSWORD_LENGTH = 8
# bcrypt raises on secrets longer than 72 bytes, so cap it here instead of
# letting hash_password() blow up into a 500.
MAX_PASSWORD_LENGTH = 72

_password_field = Field(min_length=MIN_PASSWORD_LENGTH, max_length=MAX_PASSWORD_LENGTH)


# --- Auth / Users ---

class _EmailPassword(BaseModel):
    email: str
    password: str = _password_field

    @field_validator("email")
    @classmethod
    def _valid_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("Enter a valid email address")
        return v


class UserRegister(_EmailPassword):
    pass


class UserCreate(_EmailPassword):
    """Admin-created account. Not subject to the self-registration allowlist."""

    is_admin: bool = False


class UserLogin(BaseModel):
    # No format/length rules here: login must not leak the password policy, and
    # existing accounts may predate it.
    email: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    is_admin: bool
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminUpdate(BaseModel):
    is_admin: bool


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = _password_field


class PasswordReset(BaseModel):
    new_password: str = _password_field


# --- Products ---

class ProductBase(BaseModel):
    # min_length rejects empty serials/brands; ge=0 rejects negative prices
    # (the API previously accepted price=-100).
    serial_number: str = Field(min_length=1, max_length=100)
    brand: str = Field(min_length=1, max_length=100)
    model_no: str | None = None
    category: str | None = None
    description: str | None = None
    price: float | None = Field(default=None, ge=0)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    serial_number: str | None = Field(default=None, min_length=1, max_length=100)
    brand: str | None = Field(default=None, min_length=1, max_length=100)
    model_no: str | None = None
    category: str | None = None
    description: str | None = None
    price: float | None = Field(default=None, ge=0)


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    # Set via POST /products/{id}/image, not the create/update payload, so it is
    # present (as null) from the moment an item is created.
    image_url: str | None = None
    created_at: datetime
    updated_at: datetime


class InventorySummary(BaseModel):
    """Dashboard rollup, so clients don't download the catalogue just to count it."""

    total_units: int
    total_products: int
    total_value: float
    categories: int


# --- Categories ---

class CategoryOut(BaseModel):
    """Categories are strings on products; this is a derived view with counts."""

    name: str
    units: int
    total_value: float


class CategoryRename(BaseModel):
    new_name: str = Field(min_length=1, max_length=100)


# --- Search ---

class SearchRequest(BaseModel):
    query: str


class SearchResponse(BaseModel):
    answer: str
    matched_products: list[ProductOut]
    count: int
