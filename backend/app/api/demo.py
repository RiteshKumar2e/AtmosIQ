"""Scripted live demo scenario.

The scenario runs the *production* pipeline end to end — it does not replay a
canned response. A synthetic report is created, a generated image is passed to
the multimodal stage, the risk engine scores it, a hotspot is registered, the
forecast is recomputed, and an authority alert is dispatched.

Everything it creates is tagged so `POST /api/demo/reset` can remove it and
return the database to its seeded baseline between runs.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.alerts import serialise_alert
from app.api.deps import get_current_user, resolve_region
from app.api.hotspots import serialise_hotspot
from app.api.reports import serialise_assessment, serialise_report
from app.config import settings
from app.database.session import get_db
from app.models.models import AIAssessment, Alert, CitizenReport, Hotspot, User
from app.schemas.schemas import DemoScenarioOut, DemoScenarioStep, ForecastOut
from app.services import forecast_service, gemini_service, pipeline_service
from app.utils.demo_image import render_industrial_plume
from app.utils.cache import invalidate as invalidate_cache

router = APIRouter(prefix="/api/demo", tags=["Demo Scenario"])

SCENARIO_MARKER = "[demo-scenario]"

SCENARIO_DESCRIPTION = (
    "Thick dark grey smoke has been rising from a facility behind the industrial "
    "estate for the past twenty minutes. It is drifting low across the residential "
    "blocks and there is a strong burning smell. Visibility down the road has "
    "dropped noticeably."
)


@router.get("/scenario")
def scenario_outline() -> Dict[str, Any]:
    """The narrative the UI plays through, fetched before the run starts."""
    return {
        "title": "Unreported industrial emission detected by citizen signal",
        "narrative": (
            "A resident near an industrial corridor notices unusual smoke and submits "
            "a photograph. No fixed monitoring station covers that location. "
            "AeroShield fuses the citizen signal with meteorological, satellite, and "
            "historical context, classifies the event, scores the risk, and escalates "
            "to the responding authority — in under a minute."
        ),
        "duration_estimate_seconds": 45,
        "steps": [
            {"key": "report_received", "title": "Citizen signal received",
             "detail": "Photograph, geolocation, and description submitted from the field"},
            {"key": "environmental_fusion", "title": "Environmental context fused",
             "detail": "Air quality, meteorology, satellite features, and local history joined"},
            {"key": "ai_analysis", "title": "Multimodal AI analysis",
             "detail": "The image is classified into an event type with visible indicators"},
            {"key": "risk_scored", "title": "Risk score computed",
             "detail": "Weighted fusion across every available signal channel"},
            {"key": "hotspot", "title": "Hotspot registered",
             "detail": "A new hyperlocal hotspot appears on the intelligence map"},
            {"key": "forecast", "title": "Forecast recomputed",
             "detail": "Six-hour risk trajectory updated with the new source loading"},
            {"key": "alert", "title": "Authority alert dispatched",
             "detail": "A prioritised alert with a concrete intervention reaches the queue"},
        ],
        "ai_provider": gemini_service.provider(),
    }


@router.post("/scenario/run", response_model=DemoScenarioOut)
async def run_scenario(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    region_code: str = Query(default=None, max_length=8),
) -> DemoScenarioOut:
    """Execute the full scenario against the live pipeline."""
    region = resolve_region(db, region_code)

    # Place the event on the industrial edge of the region, deliberately away
    # from any seeded monitoring station — that coverage gap is the point.
    latitude = round(region.center_lat + 0.062, 6)
    longitude = round(region.center_lon + 0.078, 6)

    image_bytes = render_industrial_plume()
    filename = f"demo-scenario-{secrets.token_hex(6)}.png"
    (settings.upload_dir / filename).write_bytes(image_bytes)

    report = CitizenReport(
        user_id=user.id,
        latitude=latitude,
        longitude=longitude,
        country_code=region.country_code,
        region_code=region.region_code,
        location_label=f"Industrial Corridor, {region.name}",
        report_type="industrial_emission",
        description=f"{SCENARIO_DESCRIPTION} {SCENARIO_MARKER}",
        image_url=f"/static/uploads/{filename}",
        pm25=148.0,
        pm10=232.0,
        temperature=24.5,
        humidity=71.0,
        status="PENDING",
        data_mode="SIMULATED",
        is_demo_seed=True,
    )
    db.add(report)
    db.commit()
    invalidate_cache()
    db.refresh(report)

    result = await pipeline_service.analyze_report(
        db, report, image_bytes=image_bytes, image_mime="image/png"
    )
    db.refresh(report)

    hotspot: Hotspot = result["hotspot"]
    alert: Alert = result["alert"]
    if hotspot is None or alert is None:
        # The pipeline is honest: it only escalates when evidence supports it.
        # If ambient conditions are genuinely clean the scenario says so rather
        # than fabricating an alert.
        raise HTTPException(
            status_code=409,
            detail=(
                "The pipeline assessed this event below the escalation threshold, so "
                "no hotspot or alert was created. Current ambient conditions in "
                f"{region.name} are favourable. Re-run when conditions are less "
                "favourable, or submit a report with stronger local sensor evidence."
            ),
        )

    snapshot = await pipeline_service.region_snapshot(db, region)
    forecast_raw = forecast_service.generate_forecast(
        current_risk=max(snapshot["risk"].risk_score, hotspot.risk_score * 0.92),
        horizon_hours=6,
        dispersion_index=snapshot["weather"]["dispersion_index"],
        wind_speed_ms=snapshot["weather"]["wind_speed_ms"],
        precipitation_mm=snapshot["weather"].get("precipitation_mm", 0.0),
        active_hotspots=len(snapshot["hotspots"]),
        current_pm25=snapshot["air_quality"]["pm25"],
        history=snapshot["history"],
        citizen_signals_24h=snapshot["signals_24h"],
        data_mode="MODELLED",
    )

    steps: List[DemoScenarioStep] = [DemoScenarioStep(**step) for step in result["steps"]]
    # Insert the forecast step ahead of the alert step so the played sequence
    # matches the narrative order.
    forecast_step = DemoScenarioStep(
        key="forecast",
        title="Forecast recomputed",
        detail=(
            f"Six-hour outlook is {forecast_raw['trend'].lower()}, peaking at "
            f"{forecast_raw['peak_risk']:.0f}/100 around {forecast_raw['peak_at']} UTC"
        ),
        duration_ms=result["total_ms"],
        payload={"trend": forecast_raw["trend"], "peak_risk": forecast_raw["peak_risk"]},
    )
    alert_index = next((i for i, s in enumerate(steps) if s.key == "alert"), len(steps))
    steps.insert(alert_index, forecast_step)

    forecast = ForecastOut(
        region_code=region.region_code,
        country_code=region.country_code,
        horizon_hours=forecast_raw["horizon_hours"],
        generated_at=forecast_raw["generated_at"],
        current_risk=forecast_raw["current_risk"],
        peak_risk=forecast_raw["peak_risk"],
        peak_at=forecast_raw["peak_at"],
        trend=forecast_raw["trend"],
        points=forecast_raw["points"],
        contributing_factors=forecast_raw["contributing_factors"],
        model_name=forecast_raw["model_name"],
        model_note=forecast_raw["model_note"],
        data_mode=forecast_raw["data_mode"],
        ai_summary=forecast_raw["narrative"],
    )

    return DemoScenarioOut(
        scenario_id=secrets.token_hex(8),
        title="Unreported industrial emission detected by citizen signal",
        narrative=(
            f"A citizen signal from {report.location_label} was fused with "
            f"{result['risk'].signals_used} independent evidence channels and scored "
            f"{hotspot.risk_score:.0f}/100 ({hotspot.risk_level}). "
            f"An alert has been routed to the {region.region_code} operations queue."
        ),
        steps=steps,
        report=serialise_report(report),
        assessment=serialise_assessment(result["assessment"]),
        hotspot=serialise_hotspot(hotspot),
        alert=serialise_alert(alert),
        forecast=forecast,
        ai_provider=result["ai_provider"],
        total_ms=result["total_ms"],
    )


@router.post("/reset")
def reset_scenario(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Remove everything previous scenario runs created.

    Only artefacts carrying the scenario marker are touched, so seeded
    demonstration data and genuine citizen submissions are left intact.
    """
    reports = db.scalars(
        select(CitizenReport).where(CitizenReport.description.contains(SCENARIO_MARKER))
    ).all()

    removed_files = 0
    hotspot_ids: List[int] = []
    for report in reports:
        if report.image_url:
            path = settings.upload_dir / report.image_url.rsplit("/", 1)[-1]
            if path.is_file() and path.parent.resolve() == settings.upload_dir.resolve():
                path.unlink()
                removed_files += 1
        hotspot_ids.extend(
            db.scalars(select(Hotspot.id).where(Hotspot.report_id == report.id)).all()
        )

    alerts_removed = 0
    if hotspot_ids:
        alerts = db.scalars(select(Alert).where(Alert.hotspot_id.in_(hotspot_ids))).all()
        alerts_removed = len(alerts)
        for alert in alerts:
            db.delete(alert)

        for hotspot in db.scalars(select(Hotspot).where(Hotspot.id.in_(hotspot_ids))).all():
            db.delete(hotspot)

    report_ids = [r.id for r in reports]
    if report_ids:
        for assessment in db.scalars(
            select(AIAssessment).where(AIAssessment.report_id.in_(report_ids))
        ).all():
            db.delete(assessment)

    for report in reports:
        db.delete(report)

    db.commit()
    invalidate_cache()
    return {
        "detail": "Demo scenario artefacts removed",
        "reports_removed": len(reports),
        "hotspots_removed": len(hotspot_ids),
        "alerts_removed": alerts_removed,
        "images_removed": removed_files,
        "reset_at": datetime.now(timezone.utc),
    }
