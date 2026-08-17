"""Near-term pollution risk forecasting endpoint."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import resolve_region
from app.database.session import get_db
from app.schemas.schemas import ForecastOut
from app.services import forecast_service, pipeline_service
from app.utils.cache import cached

router = APIRouter(prefix="/api/forecast", tags=["Forecast"])


@router.get("", response_model=ForecastOut)
@cached(ttl=120, prefix="forecast")
async def get_forecast(
    db: Session = Depends(get_db),
    region_code: str | None = Query(default=None, max_length=8),
    horizon_hours: int = Query(default=6, ge=1, le=24),
) -> ForecastOut:
    """Forecast regional pollution risk over the requested horizon.

    The current fused risk that anchors the curve is produced by the same risk
    engine that scores individual reports, so the forecast and the dashboard
    can never disagree about the present state.
    """
    region = resolve_region(db, region_code)
    snapshot = await pipeline_service.region_snapshot(db, region)

    risk = snapshot["risk"]
    weather = snapshot["weather"]
    air = snapshot["air_quality"]

    # The forecast is only as "live" as its weakest anchor input.
    data_mode = "LIVE" if air["data_mode"] == "LIVE" and weather["data_mode"] == "LIVE" else "MODELLED"

    result = forecast_service.generate_forecast(
        current_risk=risk.risk_score,
        horizon_hours=horizon_hours,
        dispersion_index=weather["dispersion_index"],
        wind_speed_ms=weather["wind_speed_ms"],
        precipitation_mm=weather.get("precipitation_mm", 0.0),
        active_hotspots=len(snapshot["hotspots"]),
        current_pm25=air["pm25"],
        history=snapshot["history"],
        citizen_signals_24h=snapshot["signals_24h"],
        data_mode=data_mode,
    )

    return ForecastOut(
        region_code=region.region_code,
        country_code=region.country_code,
        horizon_hours=result["horizon_hours"],
        generated_at=result["generated_at"],
        current_risk=result["current_risk"],
        peak_risk=result["peak_risk"],
        peak_at=result["peak_at"],
        trend=result["trend"],
        points=result["points"],
        contributing_factors=result["contributing_factors"],
        model_name=result["model_name"],
        model_note=result["model_note"],
        data_mode=result["data_mode"],
        ai_summary=result["narrative"],
    )
