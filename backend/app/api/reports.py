"""Citizen report intake, listing, and AI analysis."""

from __future__ import annotations

import json
import math
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_optional_user
from app.database.session import get_db
from app.models.models import AIAssessment, CitizenReport, User
from app.schemas.schemas import (
    REPORT_TYPES,
    AnalyzeResponse,
    AssessmentOut,
    ReportListOut,
    ReportOut,
)
from app.services import gemini_service, pipeline_service
from app.utils.files import save_upload
from app.utils.geo import validate_coordinates

router = APIRouter(prefix="/api/reports", tags=["Citizen Reports"])


# --------------------------------------------------------------------------
# Serialisation
# --------------------------------------------------------------------------
def _loads(raw: Optional[str], default: Any) -> Any:
    if not raw:
        return default
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        return default


def serialise_assessment(assessment: AIAssessment) -> AssessmentOut:
    return AssessmentOut(
        id=assessment.id,
        report_id=assessment.report_id,
        event_type=assessment.event_type,
        severity=assessment.severity,
        risk_score=assessment.risk_score,
        risk_level=assessment.risk_level,
        hotspot_probability=assessment.hotspot_probability,
        confidence=assessment.confidence,
        likely_source=assessment.likely_source,
        ai_summary=assessment.ai_summary,
        recommended_action=assessment.recommended_action,
        visible_indicators=_loads(assessment.visible_indicators, []),
        environmental_concerns=_loads(assessment.environmental_concerns, []),
        contributions=_loads(assessment.contributions, []),
        evidence=_loads(assessment.evidence, {}),
        forecast_note=assessment.forecast_note,
        ai_provider=assessment.ai_provider,
        model_name=assessment.model_name,
        analysis_ms=assessment.analysis_ms,
        created_at=assessment.created_at,
    )


def serialise_report(report: CitizenReport) -> ReportOut:
    return ReportOut(
        id=report.id,
        user_id=report.user_id,
        reporter_name=report.user.name if report.user else "Anonymous citizen",
        latitude=report.latitude,
        longitude=report.longitude,
        country_code=report.country_code,
        region_code=report.region_code,
        location_label=report.location_label,
        report_type=report.report_type,
        description=report.description,
        image_url=report.image_url,
        pm25=report.pm25,
        pm10=report.pm10,
        temperature=report.temperature,
        humidity=report.humidity,
        status=report.status,
        data_mode=report.data_mode,
        is_demo_seed=report.is_demo_seed,
        created_at=report.created_at,
        assessment=serialise_assessment(report.assessment) if report.assessment else None,
    )


# --------------------------------------------------------------------------
# Routes
# --------------------------------------------------------------------------
@router.get("/types", tags=["Citizen Reports"])
def report_types() -> Dict[str, List[Dict[str, str]]]:
    labels = {
        "smoke": "Smoke",
        "dust": "Dust",
        "burning": "Burning",
        "industrial_emission": "Industrial Emission",
        "smog": "Smog / Haze",
        "other": "Other",
    }
    return {"types": [{"value": t, "label": labels[t]} for t in REPORT_TYPES]}


@router.get("", response_model=ReportListOut)
def list_reports(
    db: Session = Depends(get_db),
    region_code: Optional[str] = Query(default=None, max_length=8),
    report_type: Optional[str] = Query(default=None, max_length=48),
    report_status: Optional[str] = Query(default=None, alias="status", max_length=24),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=100),
) -> ReportListOut:
    query = select(CitizenReport)
    count_query = select(func.count()).select_from(CitizenReport)

    filters = []
    if region_code:
        filters.append(CitizenReport.region_code == region_code.upper())
    if report_type:
        filters.append(CitizenReport.report_type == report_type.lower())
    if report_status:
        filters.append(CitizenReport.status == report_status.upper())

    for condition in filters:
        query = query.where(condition)
        count_query = count_query.where(condition)

    total = db.scalar(count_query) or 0
    rows = db.scalars(
        query.order_by(CitizenReport.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return ReportListOut(
        items=[serialise_report(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, math.ceil(total / page_size)),
    )


@router.get("/{report_id}", response_model=ReportOut)
def get_report(report_id: int, db: Session = Depends(get_db)) -> ReportOut:
    report = db.get(CitizenReport, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return serialise_report(report)


@router.post("", response_model=AnalyzeResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    latitude: float = Form(...),
    longitude: float = Form(...),
    report_type: str = Form(...),
    description: str = Form(default=""),
    location_label: str = Form(default=""),
    country_code: str = Form(default="IN"),
    region_code: str = Form(default="IN-DL"),
    pm25: Optional[float] = Form(default=None),
    pm10: Optional[float] = Form(default=None),
    temperature: Optional[float] = Form(default=None),
    humidity: Optional[float] = Form(default=None),
    image: Optional[UploadFile] = File(default=None),
    analyze: bool = Form(default=True),
) -> AnalyzeResponse:
    """Submit a citizen observation and run the full detection pipeline.

    Multipart rather than JSON because the image travels with the report — one
    round trip from the field, which matters on a weak mobile connection.
    """
    normalised_type = report_type.strip().lower().replace(" ", "_")
    if normalised_type not in REPORT_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"report_type must be one of: {', '.join(REPORT_TYPES)}",
        )

    try:
        lat, lon = validate_coordinates(latitude, longitude)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    sensor = _validate_sensor_values(pm25, pm10, temperature, humidity)

    image_url: Optional[str] = None
    image_bytes: Optional[bytes] = None
    image_mime = "image/jpeg"
    if image is not None and image.filename:
        image_url, image_bytes, image_mime = await save_upload(image)

    report = CitizenReport(
        user_id=user.id,
        latitude=lat,
        longitude=lon,
        country_code=country_code.upper()[:2],
        region_code=region_code.upper()[:8],
        location_label=location_label.strip()[:160],
        report_type=normalised_type,
        description=description.strip()[:2000],
        image_url=image_url,
        pm25=sensor["pm25"],
        pm10=sensor["pm10"],
        temperature=sensor["temperature"],
        humidity=sensor["humidity"],
        status="PENDING",
        data_mode="LIVE",
        is_demo_seed=False,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    if not analyze:
        return AnalyzeResponse(
            report=serialise_report(report),
            assessment=None,  # type: ignore[arg-type]
            ai_provider=gemini_service.provider(),
            pipeline=["report_received"],
        )

    result = await pipeline_service.analyze_report(
        db, report, image_bytes=image_bytes, image_mime=image_mime
    )
    db.refresh(report)

    from app.api.hotspots import serialise_hotspot
    from app.api.alerts import serialise_alert

    return AnalyzeResponse(
        report=serialise_report(report),
        assessment=serialise_assessment(result["assessment"]),
        hotspot=serialise_hotspot(result["hotspot"]) if result["hotspot"] else None,
        alert=serialise_alert(result["alert"]) if result["alert"] else None,
        ai_provider=result["ai_provider"],
        pipeline=[step["key"] for step in result["steps"]],
    )


@router.post("/{report_id}/analyze", response_model=AnalyzeResponse)
async def analyze_existing_report(
    report_id: int,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
) -> AnalyzeResponse:
    """(Re-)run the pipeline for a stored report.

    Used to analyse seeded reports on demand and to refresh an assessment once
    a Gemini key has been configured.
    """
    report = db.get(CitizenReport, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    result = await pipeline_service.analyze_report(db, report)
    db.refresh(report)

    from app.api.hotspots import serialise_hotspot
    from app.api.alerts import serialise_alert

    return AnalyzeResponse(
        report=serialise_report(report),
        assessment=serialise_assessment(result["assessment"]),
        hotspot=serialise_hotspot(result["hotspot"]) if result["hotspot"] else None,
        alert=serialise_alert(result["alert"]) if result["alert"] else None,
        ai_provider=result["ai_provider"],
        pipeline=[step["key"] for step in result["steps"]],
    )


def _validate_sensor_values(
    pm25: Optional[float],
    pm10: Optional[float],
    temperature: Optional[float],
    humidity: Optional[float],
) -> Dict[str, Optional[float]]:
    """Range-check client-supplied sensor values.

    Out-of-range values are rejected rather than clamped: a PM2.5 of 9000 is a
    faulty or spoofed sensor, and silently rewriting it to a plausible number
    would launder bad data into the risk engine.
    """
    bounds = {
        "pm25": (0.0, 1500.0, "PM2.5"),
        "pm10": (0.0, 2000.0, "PM10"),
        "temperature": (-60.0, 65.0, "Temperature"),
        "humidity": (0.0, 100.0, "Humidity"),
    }
    values = {"pm25": pm25, "pm10": pm10, "temperature": temperature, "humidity": humidity}
    cleaned: Dict[str, Optional[float]] = {}

    for key, value in values.items():
        if value is None:
            cleaned[key] = None
            continue
        low, high, label = bounds[key]
        if not math.isfinite(value) or not low <= value <= high:
            raise HTTPException(
                status_code=422,
                detail=f"{label} reading must be between {low:g} and {high:g}",
            )
        cleaned[key] = round(float(value), 2)

    if cleaned["pm25"] is not None and cleaned["pm10"] is not None:
        if cleaned["pm10"] < cleaned["pm25"]:
            raise HTTPException(
                status_code=422,
                detail="PM10 cannot be lower than PM2.5 — PM2.5 is a subset of PM10",
            )
    return cleaned
