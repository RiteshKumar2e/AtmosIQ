"""End-to-end detection pipeline orchestration.

    Citizen report
        -> Environmental fusion   (weather / air quality / satellite / history)
        -> Gemini multimodal analysis
        -> Risk engine scoring
        -> Hotspot evaluation & clustering
        -> Alert generation
        -> Persistence

The same function backs the live citizen submission route and the scripted
demo scenario, so what a judge watches in the demo is the production path, not
a parallel mock.
"""

from __future__ import annotations

import asyncio
import json
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.models import (
    Alert,
    AIAssessment,
    CitizenReport,
    Hotspot,
    MonitoringStation,
    PollutionRecord,
    SensorReading,
)
from app.services import gemini_service, pollution_service, satellite_service, weather_service
from app.services.risk_engine import (
    RiskInputs,
    RiskResult,
    compute_risk,
    count_nearby_reports,
    historical_similarity,
    population_exposed,
    radius_for_risk,
)
from app.utils.geo import haversine_km

# Two reports within this distance are treated as observations of the same
# event rather than two separate hotspots.
HOTSPOT_MERGE_RADIUS_KM = 2.5
ALERT_THRESHOLD = 55.0  # HIGH band and above generates an authority alert


# --------------------------------------------------------------------------
# Environmental context
# --------------------------------------------------------------------------
async def build_context(
    db: Session,
    latitude: float,
    longitude: float,
    *,
    region_code: str,
    country_code: str,
    location_label: str = "",
    citizen_sensor: Optional[Dict[str, Any]] = None,
    exclude_report_id: Optional[int] = None,
) -> Dict[str, Any]:
    """Gather every evidence channel available for a point."""
    weather = await weather_service.get_weather(latitude, longitude)
    air_quality = await pollution_service.get_air_quality(latitude, longitude)
    satellite = await satellite_service.get_features(latitude, longitude)

    nearest_station, station_reading = _nearest_station_reading(db, latitude, longitude)

    recent_reports = db.scalars(
        select(CitizenReport).where(CitizenReport.region_code == region_code)
    ).all()
    nearby_count = count_nearby_reports(
        recent_reports, latitude, longitude, radius_km=3.0, hours=12,
        exclude_id=exclude_report_id,
    )

    history = db.scalars(
        select(PollutionRecord)
        .where(PollutionRecord.region_code == region_code)
        .order_by(PollutionRecord.recorded_on.desc())
        .limit(60)
    ).all()

    station_distance = (
        round(
            haversine_km(
                latitude, longitude, nearest_station.latitude, nearest_station.longitude
            ),
            2,
        )
        if nearest_station is not None
        else None
    )

    return {
        "weather": weather,
        "air_quality": air_quality,
        "satellite": satellite,
        "citizen_sensor": citizen_sensor,
        "nearby_reports": nearby_count,
        "history": history,
        "nearest_station": nearest_station,
        "station_reading": station_reading,
        "station_distance_km": station_distance,
        "location_label": location_label,
        "region_code": region_code,
        "country_code": country_code,
    }


def _nearest_station_reading(
    db: Session, latitude: float, longitude: float
) -> Tuple[Optional[MonitoringStation], Optional[SensorReading]]:
    stations = db.scalars(select(MonitoringStation)).all()
    if not stations:
        return None, None
    nearest = min(
        stations,
        key=lambda s: haversine_km(latitude, longitude, s.latitude, s.longitude),
    )
    reading = db.scalars(
        select(SensorReading)
        .where(SensorReading.station_id == nearest.id)
        .order_by(SensorReading.timestamp.desc())
        .limit(1)
    ).first()
    return nearest, reading


# A reference station only represents a location it is actually near. Beyond
# this distance its reading is regional context, not a local measurement.
STATION_REPRESENTATIVE_KM = 6.0


def _resolve_particulates(
    context: Dict[str, Any], report: Optional[CitizenReport]
) -> Tuple[Optional[float], Optional[float], str, str]:
    """Select the particulate concentration that best represents *this point*.

    The naive approach — always trust the ambient provider because it is
    "live" — is wrong for hyperlocal detection. Providers like Open-Meteo
    resolve an ~11 km model grid, which is regional *background*. A landfill
    fire or an uncontrolled stack produces concentrations several times that
    background over a few hundred metres, and that gap is precisely the signal
    this platform exists to find. Treating background as authoritative would
    average away every hotspot.

    So background acts as a floor, and the highest credible local observation
    wins above it, with its own provenance carried forward:

      1. A reference-grade station, but only when genuinely nearby.
      2. The citizen's on-site sensor — hyperlocal, though uncalibrated.
      3. Regional ambient background.

    Returns `(pm25, pm10, data_mode, provenance)`.
    """
    air = context.get("air_quality") or {}
    station_reading: Optional[SensorReading] = context.get("station_reading")
    station_distance = context.get("station_distance_km")

    candidates: List[Tuple[float, float, str, str]] = []

    if air.get("pm25") is not None:
        candidates.append(
            (
                float(air["pm25"]),
                float(air.get("pm10") or float(air["pm25"]) * 1.7),
                air.get("data_mode", "SIMULATED"),
                f"regional background ({air.get('provider', 'model')})",
            )
        )

    if (
        station_reading is not None
        and station_distance is not None
        and station_distance <= STATION_REPRESENTATIVE_KM
    ):
        candidates.append(
            (
                float(station_reading.pm25),
                float(station_reading.pm10),
                station_reading.data_mode,
                f"reference station {station_distance:.1f} km away",
            )
        )

    if report is not None and report.pm25 is not None:
        candidates.append(
            (
                float(report.pm25),
                float(report.pm10 or float(report.pm25) * 1.7),
                report.data_mode,
                "on-site citizen sensor (uncalibrated)",
            )
        )

    if not candidates:
        return None, None, "SIMULATED", "no particulate data available"

    pm25, pm10, mode, provenance = max(candidates, key=lambda c: c[0])
    return pm25, pm10, mode, provenance


# --------------------------------------------------------------------------
# Full analysis
# --------------------------------------------------------------------------
async def analyze_report(
    db: Session,
    report: CitizenReport,
    *,
    image_bytes: Optional[bytes] = None,
    image_mime: str = "image/jpeg",
) -> Dict[str, Any]:
    """Run the complete pipeline for one citizen report and persist results."""
    started = time.perf_counter()
    steps: List[Dict[str, Any]] = []

    def mark(key: str, title: str, detail: str, payload: Optional[Dict[str, Any]] = None) -> None:
        steps.append(
            {
                "key": key,
                "title": title,
                "detail": detail,
                "status": "complete",
                "duration_ms": int((time.perf_counter() - started) * 1000),
                "payload": payload or {},
            }
        )

    citizen_sensor = None
    if report.pm25 is not None or report.pm10 is not None:
        citizen_sensor = {
            "pm25": report.pm25,
            "pm10": report.pm10,
            "temperature": report.temperature,
            "humidity": report.humidity,
        }

    mark(
        "report_received",
        "Citizen signal received",
        f"{report.report_type.replace('_', ' ').title()} reported at "
        f"{report.location_label or f'{report.latitude:.3f}, {report.longitude:.3f}'}",
        {"report_id": report.id},
    )

    context = await build_context(
        db,
        report.latitude,
        report.longitude,
        region_code=report.region_code,
        country_code=report.country_code,
        location_label=report.location_label,
        citizen_sensor=citizen_sensor,
        exclude_report_id=report.id,
    )

    weather = context["weather"]
    air = context["air_quality"]
    satellite = context["satellite"]

    mark(
        "environmental_fusion",
        "Environmental context fused",
        f"PM2.5 {air.get('pm25')} ug/m3 ({air.get('data_mode')}), wind "
        f"{weather.get('wind_speed_ms')} m/s from {weather.get('wind_direction_compass')}, "
        f"dispersion index {weather.get('dispersion_index')}",
        {
            "pm25": air.get("pm25"),
            "data_mode": air.get("data_mode"),
            "dispersion_index": weather.get("dispersion_index"),
        },
    )

    # --- Stage: Gemini multimodal analysis --------------------------------
    if image_bytes is None and report.image_url:
        from app.utils.files import read_stored_image

        stored = read_stored_image(report.image_url)
        if stored:
            image_bytes, image_mime = stored

    vision = await gemini_service.analyze_image(
        image_bytes=image_bytes,
        mime_type=image_mime,
        latitude=report.latitude,
        longitude=report.longitude,
        description=report.description,
        report_type=report.report_type,
        context=context,
    )

    mark(
        "ai_analysis",
        f"AI analysis complete ({vision['ai_provider'].replace('_', ' ').title()})",
        f"Classified as {vision['event_label']} with "
        f"{vision['confidence'] * 100:.0f}% classification confidence",
        {
            "event_type": vision["event_type"],
            "severity": vision["severity"],
            "provider": vision["ai_provider"],
        },
    )

    # --- Stage: risk fusion ------------------------------------------------
    pm25, pm10, pm_mode, pm_provenance = _resolve_particulates(context, report)
    context["particulate_provenance"] = pm_provenance
    context["particulate_used"] = {"pm25": pm25, "pm10": pm10, "data_mode": pm_mode}
    hour = datetime.now(timezone.utc).hour
    similarity = historical_similarity(
        context["history"],
        current_risk_proxy=min(95.0, (pm25 or 40.0) / 2.2),
        hour_of_day=hour,
    )

    risk = compute_risk(
        RiskInputs(
            latitude=report.latitude,
            longitude=report.longitude,
            pm25=pm25,
            pm10=pm10,
            pm_data_mode=pm_mode,
            pm_provenance=pm_provenance,
            citizen_reports_nearby=context["nearby_reports"] + 1,
            visual_severity=vision["severity"],
            visual_confidence=vision["confidence"],
            dispersion_index=weather.get("dispersion_index"),
            wind_speed_ms=weather.get("wind_speed_ms"),
            aerosol_optical_depth=satellite.get("aerosol_optical_depth"),
            thermal_anomalies=int(satellite.get("thermal_anomaly_count") or 0),
            historical_similarity=similarity,
            event_type=vision["event_type"],
        )
    )

    mark(
        "risk_scored",
        "Risk score computed",
        f"{risk.risk_score:.0f}/100 ({risk.risk_level}) from {risk.signals_used} "
        f"independent signal channels",
        {
            "risk_score": risk.risk_score,
            "risk_level": risk.risk_level,
            "confidence": risk.confidence,
        },
    )

    # --- Stage: explainability --------------------------------------------
    evidence = _build_evidence(report, context, vision, risk)
    explanation = await gemini_service.explain_risk(
        risk_score=risk.risk_score,
        risk_level=risk.risk_level,
        contributions=risk.contributions,
        evidence=evidence,
        event_type=vision["event_type"],
        location_label=report.location_label,
    )

    assessment = _persist_assessment(db, report, vision, risk, explanation, evidence, started)

    # --- Stage: hotspot evaluation ----------------------------------------
    hotspot = _evaluate_hotspot(db, report, vision, risk, explanation, weather)
    if hotspot:
        mark(
            "hotspot",
            "Hotspot registered on the intelligence map",
            f"{hotspot.risk_level} hotspot at {hotspot.location_label} — "
            f"{hotspot.hotspot_probability * 100:.0f}% hotspot probability, "
            f"~{hotspot.population_exposed:,} residents in the affected radius",
            {"hotspot_id": hotspot.id, "radius_km": hotspot.radius_km},
        )

    # --- Stage: alerting ---------------------------------------------------
    alert = _maybe_create_alert(db, hotspot, vision, risk, explanation)
    if alert:
        mark(
            "alert",
            "Authority alert dispatched",
            f"{alert.severity} alert routed to the {report.region_code} operations queue",
            {"alert_id": alert.id, "severity": alert.severity},
        )

    report.status = "ANALYSED"
    db.commit()
    db.refresh(assessment)
    if hotspot:
        db.refresh(hotspot)
    if alert:
        db.refresh(alert)

    return {
        "assessment": assessment,
        "hotspot": hotspot,
        "alert": alert,
        "risk": risk,
        "vision": vision,
        "explanation": explanation,
        "context": context,
        "steps": steps,
        "ai_provider": vision["ai_provider"],
        "total_ms": int((time.perf_counter() - started) * 1000),
    }


def _build_evidence(
    report: CitizenReport,
    context: Dict[str, Any],
    vision: Dict[str, Any],
    risk: RiskResult,
) -> Dict[str, Any]:
    station: Optional[MonitoringStation] = context.get("nearest_station")
    reading: Optional[SensorReading] = context.get("station_reading")
    weather = context["weather"]
    air = context["air_quality"]
    satellite = context["satellite"]

    return {
        "citizen": {
            "report_type": report.report_type,
            "description": report.description,
            "image_url": report.image_url,
            "location_label": report.location_label,
            "coordinates": [report.latitude, report.longitude],
            "submitted_at": report.created_at.isoformat() if report.created_at else None,
            "corroborating_signals": context["nearby_reports"],
            "data_mode": "LIVE",
        },
        "citizen_sensor": (
            {
                "pm25": report.pm25,
                "pm10": report.pm10,
                "temperature": report.temperature,
                "humidity": report.humidity,
                "data_mode": "LIVE",
                "caveat": "Low-cost citizen sensor — uncalibrated, used as corroboration only",
            }
            if context.get("citizen_sensor")
            else None
        ),
        "ambient_air": {
            "pm25": air.get("pm25"),
            "pm10": air.get("pm10"),
            "no2": air.get("no2"),
            "aqi": risk.aqi,
            "aqi_category": risk.aqi_category,
            "who_exceedance": risk.who_exceedance,
            "provider": air.get("provider"),
            "data_mode": air.get("data_mode"),
            "note": "Regional background concentration on an ~11 km model grid",
        },
        "particulates_used": {
            **(context.get("particulate_used") or {}),
            "provenance": context.get("particulate_provenance"),
            "note": "The value the risk engine scored — the highest credible "
                    "observation at this point, since hyperlocal sources raise "
                    "concentrations above the regional background",
        },
        "weather": {
            "temperature": weather.get("temperature"),
            "humidity": weather.get("humidity"),
            "wind_speed_ms": weather.get("wind_speed_ms"),
            "wind_direction_deg": weather.get("wind_direction_deg"),
            "wind_direction_compass": weather.get("wind_direction_compass"),
            "dispersion_index": weather.get("dispersion_index"),
            "description": weather.get("description"),
            "provider": weather.get("provider"),
            "data_mode": weather.get("data_mode"),
        },
        "satellite": satellite,
        "nearest_station": (
            {
                "name": station.name,
                "operator": station.operator,
                "distance_km": round(
                    haversine_km(report.latitude, report.longitude,
                                 station.latitude, station.longitude), 2
                ),
                "pm25": reading.pm25 if reading else None,
                "data_mode": station.data_mode,
            }
            if station
            else None
        ),
        "vision": {
            "event_type": vision["event_type"],
            "event_label": vision["event_label"],
            "severity": vision["severity"],
            "confidence": vision["confidence"],
            "visible_indicators": vision["visible_indicators"],
            "plume_opacity": vision.get("plume_opacity"),
            "visibility_impact": vision.get("visibility_impact"),
            "measurement_caveat": vision["measurement_caveat"],
            "provider": vision["ai_provider"],
            "data_mode": "MODELLED",
        },
    }


def _persist_assessment(
    db: Session,
    report: CitizenReport,
    vision: Dict[str, Any],
    risk: RiskResult,
    explanation: Dict[str, Any],
    evidence: Dict[str, Any],
    started: float,
) -> AIAssessment:
    existing = db.scalars(
        select(AIAssessment).where(AIAssessment.report_id == report.id)
    ).first()
    if existing is not None:
        db.delete(existing)
        db.flush()

    assessment = AIAssessment(
        report_id=report.id,
        event_type=vision["event_type"],
        severity=vision["severity"],
        risk_score=risk.risk_score,
        risk_level=risk.risk_level,
        hotspot_probability=risk.hotspot_probability,
        confidence=risk.confidence,
        likely_source=explanation["likely_source"] or vision["possible_source"],
        ai_summary=explanation["summary"],
        recommended_action=explanation["recommended_action"] or vision["recommended_action"],
        visible_indicators=json.dumps(vision["visible_indicators"]),
        environmental_concerns=json.dumps(vision["environmental_concerns"]),
        contributions=json.dumps(risk.contributions),
        evidence=json.dumps(evidence, default=str),
        forecast_note=explanation["forecast_note"],
        ai_provider=vision["ai_provider"],
        model_name=vision.get("model_name", ""),
        analysis_ms=int((time.perf_counter() - started) * 1000),
    )
    db.add(assessment)
    db.flush()
    return assessment


def _evaluate_hotspot(
    db: Session,
    report: CitizenReport,
    vision: Dict[str, Any],
    risk: RiskResult,
    explanation: Dict[str, Any],
    weather: Dict[str, Any],
) -> Optional[Hotspot]:
    """Register or reinforce a hotspot when the evidence supports one.

    Below the probability floor no hotspot is created — the platform stays
    silent rather than filling the map with speculative markers.
    """
    if risk.hotspot_probability < 0.45 or risk.risk_score < 35:
        return None

    radius = radius_for_risk(risk.risk_score, weather.get("wind_speed_ms"))
    now = datetime.now(timezone.utc)

    # Merge with an active hotspot for the same event if one is close enough.
    active = db.scalars(
        select(Hotspot).where(
            Hotspot.status == "ACTIVE", Hotspot.region_code == report.region_code
        )
    ).all()
    for candidate in active:
        distance = haversine_km(
            report.latitude, report.longitude, candidate.latitude, candidate.longitude
        )
        if distance <= HOTSPOT_MERGE_RADIUS_KM and candidate.pollution_type == vision["event_type"]:
            candidate.signal_count += 1
            candidate.risk_score = round(max(candidate.risk_score, risk.risk_score), 1)
            candidate.risk_level = risk.risk_level
            candidate.hotspot_probability = max(
                candidate.hotspot_probability, risk.hotspot_probability
            )
            candidate.confidence = round((candidate.confidence + risk.confidence) / 2, 2)
            candidate.contributions = json.dumps(risk.contributions)
            candidate.ai_summary = explanation["summary"]
            candidate.recommended_action = explanation["recommended_action"]
            candidate.forecast_note = explanation["forecast_note"]
            candidate.radius_km = max(candidate.radius_km, radius)
            candidate.population_exposed = population_exposed(candidate.risk_score, candidate.radius_km)
            candidate.detected_at = now
            db.flush()
            return candidate

    hotspot = Hotspot(
        latitude=report.latitude,
        longitude=report.longitude,
        country_code=report.country_code,
        region_code=report.region_code,
        location_label=report.location_label or f"{report.latitude:.3f}, {report.longitude:.3f}",
        risk_score=risk.risk_score,
        risk_level=risk.risk_level,
        hotspot_probability=risk.hotspot_probability,
        confidence=risk.confidence,
        pollution_type=vision["event_type"],
        likely_source=explanation["likely_source"] or vision["possible_source"],
        source="CITIZEN_AI_FUSION",
        radius_km=radius,
        population_exposed=population_exposed(risk.risk_score, radius),
        signal_count=1,
        forecast_note=explanation["forecast_note"],
        forecast_trend=_trend_from_note(explanation["forecast_note"]),
        contributions=json.dumps(risk.contributions),
        ai_summary=explanation["summary"],
        recommended_action=explanation["recommended_action"],
        report_id=report.id,
        status="ACTIVE",
        data_mode="MODELLED",
        detected_at=now,
    )
    db.add(hotspot)
    db.flush()
    return hotspot


def _trend_from_note(note: str) -> str:
    lowered = (note or "").lower()
    if any(word in lowered for word in ("increase", "rise", "worsen", "escalat", "grow")):
        return "INCREASING"
    if any(word in lowered for word in ("ease", "decrease", "improve", "decline", "subsid")):
        return "DECREASING"
    return "STABLE"


def _maybe_create_alert(
    db: Session,
    hotspot: Optional[Hotspot],
    vision: Dict[str, Any],
    risk: RiskResult,
    explanation: Dict[str, Any],
) -> Optional[Alert]:
    if hotspot is None or risk.risk_score < ALERT_THRESHOLD:
        return None

    # Suppress duplicates: one open alert per hotspot.
    existing = db.scalars(
        select(Alert).where(
            Alert.hotspot_id == hotspot.id,
            Alert.status.in_(["NEW", "ACKNOWLEDGED", "ASSIGNED"]),
        )
    ).first()
    if existing is not None:
        existing.risk_score = hotspot.risk_score
        existing.severity = risk.risk_level
        existing.forecast_trend = hotspot.forecast_trend
        db.flush()
        return existing

    alert = Alert(
        hotspot_id=hotspot.id,
        severity=risk.risk_level,
        title=f"{risk.risk_level} RISK POLLUTION EVENT — {vision['event_label']}",
        description=explanation["summary"],
        location_label=hotspot.location_label,
        country_code=hotspot.country_code,
        region_code=hotspot.region_code,
        risk_score=hotspot.risk_score,
        forecast_trend=hotspot.forecast_trend,
        recommended_action=explanation["recommended_action"],
        status="NEW",
        data_mode="MODELLED",
    )
    db.add(alert)
    db.flush()
    return alert


# --------------------------------------------------------------------------
# Region-level intelligence (dashboard / forecast inputs)
# --------------------------------------------------------------------------
async def region_snapshot(db: Session, region) -> Dict[str, Any]:
    """Current fused state of a whole region, used by the overview + forecast."""
    # These three providers are independent, so awaiting them in sequence just
    # adds their latencies together (~3.8 s cold). Gathering them costs only
    # the slowest one.
    weather, air, satellite = await asyncio.gather(
        weather_service.get_weather(region.center_lat, region.center_lon),
        pollution_service.get_air_quality(region.center_lat, region.center_lon),
        satellite_service.get_features(region.center_lat, region.center_lon),
    )

    since = datetime.now(timezone.utc) - timedelta(hours=24)
    reports = db.scalars(
        select(CitizenReport).where(CitizenReport.region_code == region.region_code)
    ).all()
    signals_24h = sum(
        1
        for r in reports
        if r.created_at
        and (r.created_at if r.created_at.tzinfo else r.created_at.replace(tzinfo=timezone.utc))
        >= since
    )

    hotspots = db.scalars(
        select(Hotspot).where(
            Hotspot.region_code == region.region_code, Hotspot.status == "ACTIVE"
        )
    ).all()

    history = db.scalars(
        select(PollutionRecord)
        .where(PollutionRecord.region_code == region.region_code)
        .order_by(PollutionRecord.recorded_on.desc())
        .limit(60)
    ).all()

    similarity = historical_similarity(
        history, current_risk_proxy=min(95.0, air["pm25"] / 2.2),
        hour_of_day=datetime.now(timezone.utc).hour,
    )

    risk = compute_risk(
        RiskInputs(
            latitude=region.center_lat,
            longitude=region.center_lon,
            pm25=air["pm25"],
            pm10=air["pm10"],
            pm_data_mode=air["data_mode"],
            citizen_reports_nearby=signals_24h,
            citizen_radius_km=12.0,
            visual_severity=None,
            dispersion_index=weather["dispersion_index"],
            wind_speed_ms=weather["wind_speed_ms"],
            aerosol_optical_depth=satellite["aerosol_optical_depth"],
            thermal_anomalies=int(satellite["thermal_anomaly_count"]),
            historical_similarity=similarity,
        )
    )

    return {
        "region": region,
        "weather": weather,
        "air_quality": air,
        "satellite": satellite,
        "risk": risk,
        "signals_24h": signals_24h,
        "hotspots": hotspots,
        "history": history,
        "reports": reports,
    }
