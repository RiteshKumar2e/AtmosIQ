"""Hotspot intelligence and composite map layers."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, aliased, selectinload

from app.api.deps import resolve_region
from app.database.session import get_db
from app.models.models import CitizenReport, Hotspot, MonitoringStation, SensorReading
from app.schemas.schemas import (
    HotspotOut,
    MapLayersOut,
    MonitoringStationOut,
    WindOut,
)
from app.services import weather_service
from app.utils.cache import cached
from app.utils.geo import downwind_offset, haversine_km

router = APIRouter(prefix="/api/hotspots", tags=["Hotspots"])


def serialise_hotspot(hotspot: Hotspot) -> HotspotOut:
    try:
        contributions = json.loads(hotspot.contributions or "[]")
    except (ValueError, TypeError):
        contributions = []
    return HotspotOut(
        id=hotspot.id,
        latitude=hotspot.latitude,
        longitude=hotspot.longitude,
        country_code=hotspot.country_code,
        region_code=hotspot.region_code,
        location_label=hotspot.location_label,
        risk_score=hotspot.risk_score,
        risk_level=hotspot.risk_level,
        hotspot_probability=hotspot.hotspot_probability,
        confidence=hotspot.confidence,
        pollution_type=hotspot.pollution_type,
        likely_source=hotspot.likely_source,
        source=hotspot.source,
        radius_km=hotspot.radius_km,
        population_exposed=hotspot.population_exposed,
        signal_count=hotspot.signal_count,
        forecast_note=hotspot.forecast_note,
        forecast_trend=hotspot.forecast_trend,
        contributions=contributions,
        ai_summary=hotspot.ai_summary,
        recommended_action=hotspot.recommended_action,
        report_id=hotspot.report_id,
        status=hotspot.status,
        data_mode=hotspot.data_mode,
        detected_at=hotspot.detected_at,
    )


def serialise_station(
    station: MonitoringStation, reading: Optional[SensorReading] = None
) -> MonitoringStationOut:
    return MonitoringStationOut(
        id=station.id,
        station_code=station.station_code,
        name=station.name,
        latitude=station.latitude,
        longitude=station.longitude,
        country_code=station.country_code,
        region_code=station.region_code,
        operator=station.operator,
        coverage_radius_km=station.coverage_radius_km,
        status=station.status,
        data_mode=station.data_mode,
        latest_pm25=reading.pm25 if reading else None,
        latest_pm10=reading.pm10 if reading else None,
    )


@router.get("", response_model=List[HotspotOut])
def list_hotspots(
    db: Session = Depends(get_db),
    region_code: Optional[str] = Query(default=None, max_length=8),
    risk_level: Optional[str] = Query(default=None, max_length=16),
    hotspot_status: str = Query(default="ACTIVE", alias="status", max_length=24),
    limit: int = Query(default=100, ge=1, le=500),
) -> List[HotspotOut]:
    query = select(Hotspot)
    if region_code:
        query = query.where(Hotspot.region_code == region_code.upper())
    if risk_level:
        query = query.where(Hotspot.risk_level == risk_level.upper())
    if hotspot_status.upper() != "ALL":
        query = query.where(Hotspot.status == hotspot_status.upper())

    rows = db.scalars(
        query.order_by(Hotspot.risk_score.desc(), Hotspot.detected_at.desc()).limit(limit)
    ).all()
    return [serialise_hotspot(h) for h in rows]


@router.get("/map", response_model=MapLayersOut)
@cached(ttl=45, prefix="hotspots.map")
async def map_layers(
    db: Session = Depends(get_db),
    region_code: Optional[str] = Query(default=None, max_length=8),
) -> MapLayersOut:
    """Every layer the intelligence map renders, in one request.

    Bundled deliberately: the map needs all layers simultaneously, and a single
    round trip keeps the initial render fast on a slow connection.
    """
    region = resolve_region(db, region_code)

    hotspots = db.scalars(
        select(Hotspot)
        .where(Hotspot.region_code == region.region_code, Hotspot.status == "ACTIVE")
        .order_by(Hotspot.risk_score.desc())
        .limit(120)
    ).all()

    # `serialise_report` reads `report.user` and `report.assessment`; without
    # eager loading each report costs two extra round trips.
    reports = db.scalars(
        select(CitizenReport)
        .where(CitizenReport.region_code == region.region_code)
        .options(
            selectinload(CitizenReport.user),
            selectinload(CitizenReport.assessment),
        )
        .order_by(CitizenReport.created_at.desc())
        .limit(80)
    ).all()

    stations = db.scalars(
        select(MonitoringStation).where(MonitoringStation.region_code == region.region_code)
    ).all()

    latest_readings = _latest_readings_by_station(db, [s.id for s in stations])
    station_payload: List[MonitoringStationOut] = [
        serialise_station(station, latest_readings.get(station.id)) for station in stations
    ]

    weather = await weather_service.get_weather(region.center_lat, region.center_lon)
    wind = WindOut(
        speed_ms=weather["wind_speed_ms"],
        direction_deg=weather["wind_direction_deg"],
        direction_compass=weather["wind_direction_compass"],
        gust_ms=weather.get("wind_gust_ms", weather["wind_speed_ms"] * 1.4),
        dispersion_index=weather["dispersion_index"],
        description=weather["description"],
        data_mode=weather["data_mode"],
    )

    from app.api.reports import serialise_report

    return MapLayersOut(
        hotspots=[serialise_hotspot(h) for h in hotspots],
        reports=[serialise_report(r) for r in reports],
        stations=station_payload,
        wind=wind,
        corridors=_build_corridors(hotspots, weather),
        generated_at=datetime.now(timezone.utc),
    )


def _latest_readings_by_station(
    db: Session, station_ids: List[int]
) -> Dict[int, SensorReading]:
    """Most recent reading for each station, in one query.

    Querying per station is one network round trip each, which is the dominant
    cost of the map endpoint against a remote database. A window function ranks
    every station's readings server-side and returns only the newest.
    """
    if not station_ids:
        return {}

    ranked = (
        select(
            SensorReading,
            func.row_number()
            .over(
                partition_by=SensorReading.station_id,
                order_by=SensorReading.timestamp.desc(),
            )
            .label("rank"),
        )
        .where(SensorReading.station_id.in_(station_ids))
        .subquery()
    )

    rows = db.scalars(
        select(aliased(SensorReading, ranked)).where(ranked.c.rank == 1)
    ).all()

    return {reading.station_id: reading for reading in rows}


def _build_corridors(hotspots: List[Hotspot], weather: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Projected downwind transport corridors for significant hotspots.

    A first-order advection estimate: the plume centreline is projected from
    the source along the wind vector for the distance air travels in one hour.
    Presented as MODELLED, never as an observed measurement.
    """
    wind_from = weather.get("wind_direction_deg", 180.0)
    speed = weather.get("wind_speed_ms", 2.0)
    travel_km = max(1.5, min(14.0, speed * 3.6))

    corridors: List[Dict[str, Any]] = []
    for hotspot in hotspots:
        if hotspot.risk_score < 55:
            continue
        end_lat, end_lon = downwind_offset(
            hotspot.latitude, hotspot.longitude, wind_from, travel_km
        )
        corridors.append(
            {
                "hotspot_id": hotspot.id,
                "label": f"Downwind corridor — {hotspot.location_label}",
                "risk_level": hotspot.risk_level,
                "coordinates": [
                    [hotspot.longitude, hotspot.latitude],
                    [end_lon, end_lat],
                ],
                "travel_km": round(travel_km, 1),
                "bearing_compass": weather.get("wind_direction_compass", "—"),
                "data_mode": "MODELLED",
            }
        )
    return corridors[:8]


@router.get("/{hotspot_id}", response_model=HotspotOut)
def get_hotspot(hotspot_id: int, db: Session = Depends(get_db)) -> HotspotOut:
    hotspot = db.get(Hotspot, hotspot_id)
    if hotspot is None:
        raise HTTPException(status_code=404, detail="Hotspot not found")
    return serialise_hotspot(hotspot)


@router.get("/{hotspot_id}/signals")
def hotspot_signals(
    hotspot_id: int,
    db: Session = Depends(get_db),
    radius_km: float = Query(default=3.0, ge=0.2, le=25.0),
) -> Dict[str, Any]:
    """Citizen signals and stations that contributed to a hotspot."""
    hotspot = db.get(Hotspot, hotspot_id)
    if hotspot is None:
        raise HTTPException(status_code=404, detail="Hotspot not found")

    from app.api.reports import serialise_report

    reports = db.scalars(
        select(CitizenReport).where(CitizenReport.region_code == hotspot.region_code)
    ).all()
    nearby = [
        r
        for r in reports
        if haversine_km(hotspot.latitude, hotspot.longitude, r.latitude, r.longitude) <= radius_km
    ]
    nearby.sort(key=lambda r: r.created_at, reverse=True)

    stations = db.scalars(
        select(MonitoringStation).where(MonitoringStation.region_code == hotspot.region_code)
    ).all()
    station_distances = sorted(
        (
            {
                "name": s.name,
                "operator": s.operator,
                "distance_km": round(
                    haversine_km(hotspot.latitude, hotspot.longitude, s.latitude, s.longitude), 2
                ),
                "status": s.status,
                "data_mode": s.data_mode,
            }
            for s in stations
        ),
        key=lambda s: s["distance_km"],
    )

    return {
        "hotspot_id": hotspot.id,
        "radius_km": radius_km,
        "citizen_signals": [serialise_report(r) for r in nearby[:20]],
        "citizen_signal_count": len(nearby),
        "nearest_stations": station_distances[:3],
        "coverage_gap_km": station_distances[0]["distance_km"] if station_distances else None,
    }
