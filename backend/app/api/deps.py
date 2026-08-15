"""Shared FastAPI dependencies: auth, roles, and region resolution."""

from __future__ import annotations

from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database.session import get_db
from app.models.models import Region, User
from app.utils.security import decode_access_token

_CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)


def _token_from_header(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return token.strip()


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    token = _token_from_header(authorization)
    if token is None:
        raise _CREDENTIALS_ERROR

    payload = decode_access_token(token)
    if payload is None or not payload.get("sub"):
        raise _CREDENTIALS_ERROR

    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise _CREDENTIALS_ERROR
    return user


def get_optional_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Read-only intelligence endpoints stay viewable without a session.

    Submitting a report or acting on an alert still requires authentication.
    """
    token = _token_from_header(authorization)
    if token is None:
        return None
    payload = decode_access_token(token)
    if payload is None or not payload.get("sub"):
        return None
    return db.get(User, int(payload["sub"]))


def require_roles(*roles: str):
    """Dependency factory enforcing role-based access."""

    def _guard(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles and user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of the roles: {', '.join(roles)}",
            )
        return user

    return _guard


def resolve_region(db: Session, region_code: Optional[str] = None) -> Region:
    """Look up a deployment region, falling back to the configured default."""
    code = (region_code or settings.default_region_code).upper()
    region = db.scalars(select(Region).where(Region.region_code == code)).first()
    if region is None:
        region = db.scalars(
            select(Region).where(Region.region_code == settings.default_region_code)
        ).first()
    if region is None:
        region = db.scalars(select(Region).order_by(Region.id)).first()
    if region is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No deployment region configured. Run the seed script.",
        )
    return region
