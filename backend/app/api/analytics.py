"""Analytics: overview KPIs, trends, source attribution, and coverage."""

from __future__ import annotations

import math
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.alerts import serialise_alert
from app.api.deps import resolve_region
from app.api.hotspots import serialise_hotspot
from app.config import settings
from app.database.session import get_db
from app.models.models import (
    Alert,
    AIAssessment,
    CitizenReport,
    Hotspot,
    MonitoringStation,
    PollutionRecord,
    Region,
)
from app.schemas.schemas import (
    CoveragePoint,
    KpiOut,
    OverviewOut,
    RegionDistribution,
    SourceBreakdown,
    TrendPoint,
    TrendsOut,
    WindOut,
)
from app.services import gemini_service, pipeline_service
from app.utils.cache import cached
from app.utils.geo import haversine_km

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

SOURCE_LABELS = {
    "industrial_smoke": "Industrial",
    "traffic_pollution": "Traffic",
    "agricultural_burning": "Agriculture",
    "construction_dust": "Construction",
    "waste_burning": "Waste Burning",
    "haze_smog": "Regional Haze",
    "unknown": "Unclassified",
}


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


@router.get("/overview", response_model=OverviewOut)
@cached(ttl=60, prefix="analytics.overview")
async def overview(
    db: Session = Depends(get_db),
    region_code: str | None = Query(default=None, max_length=8),
) -> OverviewOut:
    """Everything the operational dashboard header needs, fused live."""
    region = resolve_region(db, region_code)
    snapshot = await pipeline_service.region_snapshot(db, region)

    risk = snapshot["risk"]
    weather = snapshot["weather"]
    air = snapshot["air_quality"]
    hotspots = snapshot["hotspots"]

    now = datetime.now(timezone.utc)
    yesterday_start = now - timedelta(hours=48)
    yesterday_end = now - timedelta(hours=24)

    signals_prev = sum(
        1
        for r in snapshot["reports"]
        if r.created_at and yesterday_start <= _aware(r.created_at) < yesterday_end
    )

    alerts = db.scalars(
        select(Alert)
        .where(Alert.region_code == region.region_code)
        .order_by(Alert.created_at.desc())
        .limit(20)
    ).all()
    open_alerts = [a for a in alerts if a.status not in ("RESOLVED", "DISMISSED")]
    critical = sum(1 for a in open_alerts if a.severity == "CRITICAL")

    # Yesterday's risk from the historical series gives an honest delta.
    history = snapshot["history"]
    prev_risk = history[0].avg_risk_score if history else risk.risk_score
    risk_delta = (
        round((risk.risk_score - prev_risk) / prev_risk * 100.0, 1) if prev_risk else None
    )
    signal_delta = (
        round((snapshot["signals_24h"] - signals_prev) / signals_prev * 100.0, 1)
        if signals_prev
        else None
    )

    kpis = [
        KpiOut(
            label="Current Air Risk",
            value=risk.risk_score,
            unit="/100",
            delta_pct=risk_delta,
            level=risk.risk_level,
            data_mode=air["data_mode"],
            hint=f"AQI {risk.aqi} ({risk.aqi_category}) · "
                 f"{risk.who_exceedance:g}x WHO 24h guideline",
        ),
        KpiOut(
            label="Active Hotspots",
            value=len(hotspots),
            level=_hotspot_level(hotspots),
            data_mode="MODELLED",
            hint=f"{sum(h.signal_count for h in hotspots)} contributing signals",
        ),
        KpiOut(
            label="Citizen Signals (24h)",
            value=snapshot["signals_24h"],
            delta_pct=signal_delta,
            data_mode="LIVE",
            hint=f"{len(snapshot['reports'])} total reports in region",
        ),
        KpiOut(
            label="Critical Alerts",
            value=critical,
            level="CRITICAL" if critical else "LOW",
            data_mode="MODELLED",
            hint=f"{len(open_alerts)} open alerts awaiting action",
        ),
    ]

    explanation = await gemini_service.explain_risk(
        risk_score=risk.risk_score,
        risk_level=risk.risk_level,
        contributions=risk.contributions,
        evidence={
            "weather": weather,
            "air_quality": air,
            "satellite": snapshot["satellite"],
            "active_hotspots": len(hotspots),
            "citizen_signals_24h": snapshot["signals_24h"],
        },
        event_type=hotspots[0].pollution_type if hotspots else "unknown",
        location_label=region.name,
    )

    return OverviewOut(
        region_code=region.region_code,
        country_code=region.country_code,
        region_name=region.name,
        generated_at=now,
        kpis=kpis,
        current_risk=risk.risk_score,
        current_risk_level=risk.risk_level,
        active_hotspots=len(hotspots),
        citizen_signals_24h=snapshot["signals_24h"],
        critical_alerts=critical,
        wind=WindOut(
            speed_ms=weather["wind_speed_ms"],
            direction_deg=weather["wind_direction_deg"],
            direction_compass=weather["wind_direction_compass"],
            gust_ms=weather.get("wind_gust_ms", weather["wind_speed_ms"] * 1.4),
            dispersion_index=weather["dispersion_index"],
            description=weather["description"],
            data_mode=weather["data_mode"],
        ),
        air_quality={
            "pm25": air["pm25"],
            "pm10": air["pm10"],
            "no2": air.get("no2"),
            "aqi": risk.aqi,
            "aqi_category": risk.aqi_category,
            "who_exceedance": risk.who_exceedance,
            "provider": air.get("provider"),
            "data_mode": air["data_mode"],
            "temperature": weather["temperature"],
            "humidity": weather["humidity"],
        },
        ai_provider=gemini_service.provider(),
        top_hotspots=[serialise_hotspot(h) for h in
                      sorted(hotspots, key=lambda h: h.risk_score, reverse=True)[:5]],
        recent_alerts=[serialise_alert(a) for a in open_alerts[:5]],
        explainability=risk.contributions,
        reasoning_summary=explanation["summary"],
    )


def _hotspot_level(hotspots: List[Hotspot]) -> str:
    if any(h.risk_level == "CRITICAL" for h in hotspots):
        return "CRITICAL"
    if any(h.risk_level == "HIGH" for h in hotspots):
        return "HIGH"
    return "MODERATE" if hotspots else "LOW"


@router.get("/trends", response_model=TrendsOut)
@cached(ttl=180, prefix="analytics.trends")
def trends(
    db: Session = Depends(get_db),
    region_code: str | None = Query(default=None, max_length=8),
    granularity: str = Query(default="daily", pattern="^(daily|weekly|monthly)$"),
) -> TrendsOut:
    region = resolve_region(db, region_code)

    records = db.scalars(
        select(PollutionRecord)
        .where(PollutionRecord.region_code == region.region_code)
        .order_by(PollutionRecord.recorded_on.asc())
    ).all()

    return TrendsOut(
        granularity=granularity,  # type: ignore[arg-type]
        region_code=region.region_code,
        trends=_bucket_trends(records, granularity),
        sources=_source_breakdown(db, region.region_code),
        distribution=_distribution(db),
        participation=_participation(db, region.region_code, granularity),
        coverage=_coverage(db, region.region_code),
        coverage_headline=(
            "Citizen intelligence extends environmental visibility beyond fixed "
            "monitoring stations."
        ),
        data_mode="SIMULATED",
    )


def _bucket_trends(records: List[PollutionRecord], granularity: str) -> List[TrendPoint]:
    if not records:
        return []

    buckets: Dict[str, List[PollutionRecord]] = defaultdict(list)
    for record in records:
        moment = _aware(record.recorded_on)
        if granularity == "monthly":
            key = moment.strftime("%b %Y")
        elif granularity == "weekly":
            key = f"W{moment.isocalendar().week:02d} {moment.year}"
        else:
            key = moment.strftime("%d %b")
        buckets[key].append(record)

    points: List[TrendPoint] = []
    for label, group in buckets.items():
        size = len(group)
        points.append(
            TrendPoint(
                period=label,
                avg_pm25=round(sum(r.avg_pm25 for r in group) / size, 1),
                avg_pm10=round(sum(r.avg_pm10 for r in group) / size, 1),
                avg_risk=round(sum(r.avg_risk_score for r in group) / size, 1),
                hotspots=sum(r.hotspot_count for r in group),
                reports=sum(r.report_count for r in group),
            )
        )

    limit = {"daily": 30, "weekly": 16, "monthly": 12}[granularity]
    return points[-limit:]


def _source_breakdown(db: Session, region_code: str) -> List[SourceBreakdown]:
    """Attribution from AI event classification plus registered hotspot types."""
    assessments = db.execute(
        select(AIAssessment.event_type)
        .join(CitizenReport, CitizenReport.id == AIAssessment.report_id)
        .where(CitizenReport.region_code == region_code)
    ).scalars().all()

    hotspot_types = db.scalars(
        select(Hotspot.pollution_type).where(Hotspot.region_code == region_code)
    ).all()

    counter = Counter(list(assessments) + list(hotspot_types))
    total = sum(counter.values())
    if total == 0:
        return []

    return [
        SourceBreakdown(
            source=source,
            label=SOURCE_LABELS.get(source, source.replace("_", " ").title()),
            count=count,
            share_pct=round(count / total * 100.0, 1),
        )
        for source, count in counter.most_common()
    ]


#: Regions shown in the distribution chart. Every configured region is
#: aggregated, but a 40-row card is unreadable — the busiest are what matter.
_DISTRIBUTION_LIMIT = 12


def _distribution(db: Session) -> List[RegionDistribution]:
    """Hotspot load by region — the cross-region comparison view.

    Aggregated in the database rather than per region in Python: the previous
    loop issued two queries for every configured region, which is 80 network
    round trips once every Indian state is a region.
    """
    regions = db.scalars(select(Region).order_by(Region.country_code)).all()

    hotspot_stats = {
        code: (count, average or 0.0)
        for code, count, average in db.execute(
            select(
                Hotspot.region_code,
                func.count(Hotspot.id),
                func.avg(Hotspot.risk_score),
            ).group_by(Hotspot.region_code)
        ).all()
    }

    report_counts = dict(
        db.execute(
            select(CitizenReport.region_code, func.count(CitizenReport.id))
            .group_by(CitizenReport.region_code)
        ).all()
    )

    out: List[RegionDistribution] = []
    for region in regions:
        hotspot_count, avg_risk = hotspot_stats.get(region.region_code, (0, 0.0))
        out.append(
            RegionDistribution(
                region_code=region.region_code,
                name=f"{region.flag} {region.name}".strip(),
                hotspots=hotspot_count,
                avg_risk=round(avg_risk, 1),
                reports=report_counts.get(region.region_code, 0),
            )
        )

    out.sort(key=lambda r: (r.hotspots, r.reports), reverse=True)
    return out[:_DISTRIBUTION_LIMIT]


def _participation(db: Session, region_code: str, granularity: str) -> List[TrendPoint]:
    """Citizen reporting volume over time."""
    reports = db.scalars(
        select(CitizenReport)
        .where(CitizenReport.region_code == region_code)
        .order_by(CitizenReport.created_at.asc())
    ).all()
    if not reports:
        return []

    buckets: Dict[str, int] = defaultdict(int)
    for report in reports:
        moment = _aware(report.created_at)
        if granularity == "monthly":
            key = moment.strftime("%b %Y")
        elif granularity == "weekly":
            key = f"W{moment.isocalendar().week:02d} {moment.year}"
        else:
            key = moment.strftime("%d %b")
        buckets[key] += 1

    limit = {"daily": 30, "weekly": 16, "monthly": 12}[granularity]
    items = list(buckets.items())[-limit:]
    return [
        TrendPoint(period=label, avg_pm25=0, avg_pm10=0, avg_risk=0, hotspots=0, reports=count)
        for label, count in items
    ]


def _coverage(db: Session, region_code: str) -> List[CoveragePoint]:
    """Monitoring coverage from fixed stations versus citizen signals.

    Coverage is estimated geometrically: each station covers a disc of its
    stated radius and each citizen report covers a ~1.5 km observation disc.
    Discs are approximated as non-overlapping up to the region's area, which
    slightly overstates both channels equally — the comparison between them,
    which is the point of the chart, stays fair.
    """
    stations = db.scalars(
        select(MonitoringStation).where(MonitoringStation.region_code == region_code)
    ).all()
    reports = db.scalars(
        select(CitizenReport).where(CitizenReport.region_code == region_code)
    ).all()

    region_area_km2 = 1_500.0  # typical metropolitan operating area
    station_area = sum(math.pi * s.coverage_radius_km**2 for s in stations)
    station_pct = min(100.0, station_area / region_area_km2 * 100.0)

    # Buckets by week so the chart shows citizen coverage growing over time.
    weekly: Dict[str, List[CitizenReport]] = defaultdict(list)
    for report in reports:
        moment = _aware(report.created_at)
        weekly[f"W{moment.isocalendar().week:02d}"].append(report)

    points: List[CoveragePoint] = []
    cumulative: List[CitizenReport] = []
    for label in sorted(weekly.keys())[-8:]:
        cumulative.extend(weekly[label])
        citizen_area = _unique_coverage_area(cumulative, radius_km=1.5)
        citizen_pct = min(100.0, citizen_area / region_area_km2 * 100.0)
        combined = min(100.0, station_pct + citizen_pct * 0.82)  # allow for overlap
        points.append(
            CoveragePoint(
                label=label,
                station_coverage_pct=round(station_pct, 1),
                citizen_coverage_pct=round(citizen_pct, 1),
                combined_coverage_pct=round(combined, 1),
            )
        )

    if not points:
        points.append(
            CoveragePoint(
                label="Current",
                station_coverage_pct=round(station_pct, 1),
                citizen_coverage_pct=0.0,
                combined_coverage_pct=round(station_pct, 1),
            )
        )
    return points


def _unique_coverage_area(reports: List[CitizenReport], radius_km: float) -> float:
    """Approximate union area of observation discs by de-duplicating on a grid.

    Reports closer together than the disc radius largely observe the same area,
    so counting each one separately would inflate citizen coverage. Snapping to
    a grid cell of that radius keeps the estimate defensible.
    """
    cell = radius_km / 111.32
    occupied = {
        (round(r.latitude / cell), round(r.longitude / cell)) for r in reports
    }
    return len(occupied) * math.pi * radius_km**2


@router.get("/responsible-ai")
def responsible_ai() -> Dict[str, Any]:
    """Machine-readable statement of the platform's AI limitations."""
    return {
        "ai_provider": gemini_service.provider(),
        "model": settings.gemini_model if settings.gemini_enabled else "deterministic-fallback",
        "limitations": [
            {
                "title": "Image analysis is not measurement",
                "detail": "Visual AI establishes the presence and apparent character of an "
                          "emission event. It cannot determine PM2.5, PM10, or AQI values. "
                          "Certified instrument measurement remains authoritative.",
            },
            {
                "title": "Forecasts are probabilistic",
                "detail": "The 6-hour outlook is a prototype hybrid persistence-climatology "
                          "model with uncertainty bands that widen with the horizon. It has "
                          "not been validated against an operational reference network, and "
                          "no accuracy figure is claimed.",
            },
            {
                "title": "Citizen reports require verification",
                "detail": "Reports are unverified observations. The risk engine treats them "
                          "as corroborating evidence weighted by independent signal density, "
                          "never as a sole basis for action.",
            },
            {
                "title": "Simulated data is labelled",
                "detail": "Every value carries a provenance mode — LIVE (measured from an "
                          "external provider), SIMULATED (generated for demonstration), or "
                          "MODELLED (derived by our own engines). The interface shows this "
                          "badge wherever a figure is displayed.",
            },
            {
                "title": "Recommendations assist, they do not decide",
                "detail": "Intervention recommendations are decision support for human "
                          "authorities. The platform takes no autonomous enforcement or "
                          "policy action.",
            },
            {
                "title": "Low-cost sensors are uncalibrated",
                "detail": "Citizen-supplied PM readings are accepted as corroboration only "
                          "and are ranked below reference-grade station data in the risk "
                          "engine's source precedence.",
            },
        ],
        "data_modes": {
            "LIVE": "Measured by an external provider in real time",
            "SIMULATED": "Synthetic demonstration data, deterministic and reproducible",
            "MODELLED": "Derived by the AeroShield risk or forecast engines",
        },
    }
