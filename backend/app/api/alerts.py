"""Authority alert centre: listing and lifecycle transitions."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.database.session import get_db
from app.models.models import Alert, User
from app.schemas.schemas import AlertOut, AlertUpdate
from app.utils.cache import invalidate as invalidate_cache

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

# Valid lifecycle moves. An alert cannot jump straight from NEW to RESOLVED
# without being acknowledged or assigned first — that ordering is what makes
# the audit trail meaningful.
_TRANSITIONS: Dict[str, List[str]] = {
    "NEW": ["ACKNOWLEDGED", "ASSIGNED", "DISMISSED"],
    "ACKNOWLEDGED": ["ASSIGNED", "RESOLVED", "DISMISSED"],
    "ASSIGNED": ["RESOLVED", "ACKNOWLEDGED", "DISMISSED"],
    "RESOLVED": [],
    "DISMISSED": ["NEW"],
}


def serialise_alert(alert: Alert) -> AlertOut:
    return AlertOut(
        id=alert.id,
        hotspot_id=alert.hotspot_id,
        severity=alert.severity,
        title=alert.title,
        description=alert.description,
        location_label=alert.location_label,
        country_code=alert.country_code,
        region_code=alert.region_code,
        risk_score=alert.risk_score,
        forecast_trend=alert.forecast_trend,
        recommended_action=alert.recommended_action,
        status=alert.status,
        assigned_to=alert.assigned_to,
        acknowledged_at=alert.acknowledged_at,
        resolved_at=alert.resolved_at,
        data_mode=alert.data_mode,
        created_at=alert.created_at,
    )


@router.get("", response_model=List[AlertOut])
def list_alerts(
    db: Session = Depends(get_db),
    region_code: Optional[str] = Query(default=None, max_length=8),
    severity: Optional[str] = Query(default=None, max_length=16),
    alert_status: Optional[str] = Query(default=None, alias="status", max_length=24),
    limit: int = Query(default=50, ge=1, le=200),
) -> List[AlertOut]:
    query = select(Alert)
    if region_code:
        query = query.where(Alert.region_code == region_code.upper())
    if severity:
        query = query.where(Alert.severity == severity.upper())
    if alert_status and alert_status.upper() != "ALL":
        query = query.where(Alert.status == alert_status.upper())

    rows = db.scalars(query.order_by(Alert.created_at.desc()).limit(limit)).all()
    # Severity first, then recency — an operator triages by severity.
    order = {"CRITICAL": 0, "HIGH": 1, "MODERATE": 2, "LOW": 3}
    rows.sort(key=lambda a: (order.get(a.severity, 9), -a.created_at.timestamp()))
    return [serialise_alert(a) for a in rows]


@router.get("/summary")
def alert_summary(
    db: Session = Depends(get_db),
    region_code: Optional[str] = Query(default=None, max_length=8),
) -> Dict[str, int]:
    query = select(Alert.status, Alert.severity, func.count()).group_by(
        Alert.status, Alert.severity
    )
    if region_code:
        query = query.where(Alert.region_code == region_code.upper())

    counts = {
        "total": 0, "new": 0, "acknowledged": 0, "assigned": 0, "resolved": 0,
        "dismissed": 0, "critical": 0, "high": 0, "moderate": 0, "low": 0,
    }
    for row_status, row_severity, count in db.execute(query).all():
        counts["total"] += count
        counts[row_status.lower()] = counts.get(row_status.lower(), 0) + count
        if row_status not in ("RESOLVED", "DISMISSED"):
            counts[row_severity.lower()] = counts.get(row_severity.lower(), 0) + count
    return counts


@router.get("/{alert_id}", response_model=AlertOut)
def get_alert(alert_id: int, db: Session = Depends(get_db)) -> AlertOut:
    alert = db.get(Alert, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return serialise_alert(alert)


@router.patch("/{alert_id}", response_model=AlertOut)
def update_alert(
    alert_id: int,
    payload: AlertUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("authority", "analyst")),
) -> AlertOut:
    """Advance an alert through its lifecycle. Authority/analyst roles only."""
    alert = db.get(Alert, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")

    now = datetime.now(timezone.utc)

    if payload.status is not None and payload.status != alert.status:
        allowed = _TRANSITIONS.get(alert.status, [])
        if payload.status not in allowed:
            raise HTTPException(
                status_code=409,
                detail=f"Cannot move an alert from {alert.status} to {payload.status}. "
                       f"Allowed next states: {', '.join(allowed) or 'none (terminal state)'}",
            )
        alert.status = payload.status
        if payload.status == "ACKNOWLEDGED" and alert.acknowledged_at is None:
            alert.acknowledged_at = now
        if payload.status == "RESOLVED":
            alert.resolved_at = now
            if alert.acknowledged_at is None:
                alert.acknowledged_at = now
            if alert.hotspot is not None:
                alert.hotspot.status = "RESOLVED"

    if payload.assigned_to is not None:
        alert.assigned_to = payload.assigned_to.strip()[:120] or None
        if alert.assigned_to and alert.status in ("NEW", "ACKNOWLEDGED"):
            alert.status = "ASSIGNED"
            if alert.acknowledged_at is None:
                alert.acknowledged_at = now

    db.commit()
    invalidate_cache()
    db.refresh(alert)
    return serialise_alert(alert)
