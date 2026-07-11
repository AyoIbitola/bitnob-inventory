from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_admin
from app.auth.utils import create_access_token, hash_password, verify_password
from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import (
    AdminUpdate,
    PasswordChange,
    PasswordReset,
    TokenOut,
    UserLogin,
    UserOut,
    UserRegister,
)

router = APIRouter()


@router.post("/auth/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    is_admin = payload.email.lower() in settings.admin_seed_email_list

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        is_admin=is_admin,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/auth/login", response_model=TokenOut)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = create_access_token(user.email, user.is_admin)
    return TokenOut(access_token=token)


@router.get("/auth/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/auth/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return None


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(User).all()


@router.patch("/users/{user_id}/admin", response_model=UserOut)
def set_admin(
    user_id: int,
    payload: AdminUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_admin = payload.is_admin
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/password", status_code=status.HTTP_204_NO_CONTENT)
def reset_user_password(
    user_id: int,
    payload: PasswordReset,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return None
