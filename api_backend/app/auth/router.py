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
    UserCreate,
    UserLogin,
    UserOut,
    UserRegister,
)

router = APIRouter()


def _is_allowed_domain(email: str) -> bool:
    """Is this address on an approved company domain (e.g. withbitnob.com)?"""
    allowed = settings.allowed_email_domain_list
    if not allowed:
        return True  # unset => open (previous behaviour)
    return email.rsplit("@", 1)[-1].lower() in allowed


def _reject_disallowed_domain(email: str) -> None:
    """Gate SELF-registration to approved company domains.

    Without this, anyone who finds the URL can create an account and browse the
    company's entire inventory.
    """
    if not _is_allowed_domain(email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is restricted to company email addresses.",
        )


def _create_user(db: Session, email: str, password: str, is_admin: bool) -> User:
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    user = User(email=email, password_hash=hash_password(password), is_admin=is_admin)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/auth/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    _reject_disallowed_domain(payload.email)
    is_admin = payload.email.lower() in settings.admin_seed_email_list
    return _create_user(db, payload.email, payload.password, is_admin)


@router.post("/auth/login", response_model=TokenOut)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    # Enforced at LOGIN, not just registration. Gating registration alone would
    # leave every pre-existing external account (gmail, etc.) still able to sign
    # in — the domain lock has to apply to the door, not just the sign-up form.
    if not _is_allowed_domain(payload.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access is restricted to company email addresses.",
        )

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


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Admin-provisioned account.

    The domain rule applies here too: login rejects non-company addresses, so
    creating one would just produce an account that can never sign in.
    """
    _reject_disallowed_domain(payload.email)
    return _create_user(db, payload.email, payload.password, payload.is_admin)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Remove an account (offboarding — and lets us scrub the leftover
    *@example.com test accounts, which currently cannot be deleted at all)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account"
        )

    db.delete(user)
    db.commit()
    return None


@router.patch("/users/{user_id}/admin", response_model=UserOut)
def set_admin(
    user_id: int,
    payload: AdminUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Guard against locking yourself — and possibly everyone — out.
    if user.id == current_user.id and not payload.is_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot revoke your own admin access",
        )

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
