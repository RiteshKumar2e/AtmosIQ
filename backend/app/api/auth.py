"""Authentication: registration, login, demo sessions, and profile."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.config import settings
from app.database.session import get_db
from app.models.models import User
from app.schemas.schemas import (
    DemoLoginRequest,
    TokenResponse,
    UserLogin,
    UserOut,
    UserRegister,
)
from app.utils.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

DEMO_ACCOUNTS = {
    "authority": {
        "email": "authority@aeroshield.demo",
        "name": "Demo Authority",
        "organisation": "Municipal Environmental Response Unit",
    },
    "analyst": {
        "email": "analyst@aeroshield.demo",
        "name": "Demo Analyst",
        "organisation": "Air Quality Intelligence Cell",
    },
    "citizen": {
        "email": "citizen@aeroshield.demo",
        "name": "Demo Citizen",
        "organisation": None,
    },
}

# Documented, non-production demo password. Real accounts choose their own.
DEMO_PASSWORD = "Demo@2025"


def _issue(user: User) -> TokenResponse:
    token = create_access_token(
        subject=str(user.id),
        extra={"role": user.role, "email": user.email, "region": user.region_code},
    )
    return TokenResponse(
        access_token=token,
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserOut.model_validate(user),
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)) -> TokenResponse:
    email = payload.email.lower().strip()
    if db.scalars(select(User).where(User.email == email)).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists",
        )

    # Elevated roles cannot be self-granted through public registration.
    role = payload.role if payload.role in ("citizen", "analyst") else "citizen"

    user = User(
        name=payload.name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        role=role,
        organisation=payload.organisation,
        country_code=payload.country_code.upper(),
        region_code=payload.region_code.upper(),
        is_demo=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _issue(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalars(select(User).where(User.email == payload.email.lower().strip())).first()
    # Uniform error message + constant-time comparison: no account enumeration.
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    return _issue(user)


@router.post("/demo-login", response_model=TokenResponse)
def demo_login(payload: DemoLoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """One-click session for the three seeded demo personas."""
    profile = DEMO_ACCOUNTS[payload.role]
    user = db.scalars(select(User).where(User.email == profile["email"])).first()
    if user is None:
        user = User(
            name=profile["name"],
            email=profile["email"],
            password_hash=hash_password(DEMO_PASSWORD),
            role=payload.role,
            organisation=profile["organisation"],
            country_code=settings.default_country_code,
            region_code=settings.default_region_code,
            is_demo=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return _issue(user)


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)


@router.post("/logout")
def logout(user: User = Depends(get_current_user)) -> dict:
    """Stateless JWT logout.

    The client discards the token. A production deployment would additionally
    push the token id onto a short-lived revocation list (e.g. Redis) so an
    already-issued token can be invalidated before it expires.
    """
    return {"detail": "Signed out", "user_id": user.id}
