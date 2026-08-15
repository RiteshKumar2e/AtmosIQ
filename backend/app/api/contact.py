"""Public contact form intake.

Prototype limitation: enquiries are persisted and logged rather than emailed.
A production deployment would hand the stored record to a transactional mail
service; nothing else about this endpoint would change.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import ContactMessage
from app.schemas.schemas import ContactCreate, ContactOut

logger = logging.getLogger("aeroshield.contact")

router = APIRouter(prefix="/api/contact", tags=["Contact"])


@router.post("", response_model=ContactOut, status_code=status.HTTP_201_CREATED)
def submit_contact_message(
    payload: ContactCreate, db: Session = Depends(get_db)
) -> ContactOut:
    """Record an enquiry from the public contact page."""
    message = ContactMessage(
        full_name=payload.full_name.strip(),
        email=payload.email.lower().strip(),
        organization=(payload.organization or "").strip() or None,
        subject=payload.subject.strip(),
        message=payload.message.strip(),
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    logger.info("[PROTOTYPE] Contact enquiry #%s from %s", message.id, message.email)

    return ContactOut(
        id=message.id,
        detail="Thank you for reaching out. Our team will respond within two working days.",
        created_at=message.created_at,
    )
