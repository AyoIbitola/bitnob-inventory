from datetime import datetime

from pydantic import BaseModel, ConfigDict


# --- Auth / Users ---

class UserRegister(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
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


# --- Products ---

class ProductBase(BaseModel):
    serial_number: str
    brand: str
    model_no: str | None = None
    category: str | None = None
    description: str | None = None
    price: float | None = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    serial_number: str | None = None
    brand: str | None = None
    model_no: str | None = None
    category: str | None = None
    description: str | None = None
    price: float | None = None


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


# --- Search ---

class SearchRequest(BaseModel):
    query: str


class SearchResponse(BaseModel):
    answer: str
    matched_products: list[ProductOut]
    count: int
