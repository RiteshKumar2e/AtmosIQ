"""BRICS cross-border interoperability layer.

This endpoint publishes what a partner node would actually exchange: the shared
schema version, the aggregate (non-personal) indicators derived locally, and
the federation contract. Raw citizen reports never cross a border — only
aggregates and model representations do.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database.session import get_db
from app.models.models import CitizenReport, Hotspot, MonitoringStation, Region
from app.schemas.schemas import BricsNode, BricsOverviewOut
from app.services.forecast_service import MODEL_NAME as FORECAST_MODEL
from app.services.risk_engine import WEIGHTS

router = APIRouter(prefix="/api/brics", tags=["BRICS Network"])

SCHEMA_VERSION = "1.0.0"
MODEL_VERSION = "aeroshield-risk-v1"


@router.get("/overview", response_model=BricsOverviewOut)
def brics_overview(
    db: Session = Depends(get_db),
    country_code: Optional[str] = Query(default=None, max_length=2),
) -> BricsOverviewOut:
    query = select(Region).order_by(Region.country_code)
    if country_code:
        query = query.where(Region.country_code == country_code.upper())
    regions = db.scalars(query).all()

    nodes: List[BricsNode] = []
    for region in regions:
        stations = db.scalars(
            select(MonitoringStation).where(
                MonitoringStation.region_code == region.region_code
            )
        ).all()
        reports = db.scalars(
            select(CitizenReport).where(CitizenReport.region_code == region.region_code)
        ).all()
        hotspots = db.scalars(
            select(Hotspot).where(
                Hotspot.region_code == region.region_code, Hotspot.status == "ACTIVE"
            )
        ).all()

        nodes.append(
            BricsNode(
                country_code=region.country_code,
                country_name=region.country_name,
                flag=region.flag,
                region_code=region.region_code,
                region_name=region.name,
                node_status=region.node_status,
                data_mode=region.data_mode,
                population_millions=region.population_millions,
                monitoring_stations=len(stations),
                citizen_signals=len(reports),
                active_hotspots=len(hotspots),
                avg_risk=(
                    round(sum(h.risk_score for h in hotspots) / len(hotspots), 1)
                    if hotspots
                    else 0.0
                ),
                model_version=MODEL_VERSION,
                schema_version=SCHEMA_VERSION,
                last_sync=datetime.now(timezone.utc),
            )
        )

    return BricsOverviewOut(
        network_name="BRICS Climate Intelligence Network",
        schema_version=SCHEMA_VERSION,
        nodes=nodes,
        shared_schema=_shared_schema(),
        federation_principles=_principles(),
        interoperability_layers=_layers(),
        aggregate={
            "member_states": len({n.country_code for n in nodes}),
            "deployed_nodes": sum(1 for n in nodes if n.node_status == "ACTIVE"),
            "pilot_nodes": sum(1 for n in nodes if n.node_status == "PILOT"),
            "planned_nodes": sum(1 for n in nodes if n.node_status == "PLANNED"),
            "population_covered_millions": round(
                sum(n.population_millions for n in nodes), 1
            ),
            "total_stations": sum(n.monitoring_stations for n in nodes),
            "total_citizen_signals": sum(n.citizen_signals for n in nodes),
            "total_active_hotspots": sum(n.active_hotspots for n in nodes),
        },
        generated_at=datetime.now(timezone.utc),
        data_mode="SIMULATED",
    )


def _shared_schema() -> Dict[str, Any]:
    """The exchange contract each national node implements.

    Deliberately small. Interoperability fails when the contract is large, so
    only the fields needed for cross-border situational awareness are shared.
    """
    return {
        "version": SCHEMA_VERSION,
        "identifiers": {
            "country_code": "ISO 3166-1 alpha-2",
            "region_code": "ISO 3166-2",
            "timestamps": "RFC 3339 / ISO 8601 with UTC offset",
            "coordinates": "WGS 84 decimal degrees",
        },
        "risk_model": {
            "score_range": "0-100, monotonic with population exposure risk",
            "bands": {"LOW": "0-34", "MODERATE": "35-54", "HIGH": "55-74", "CRITICAL": "75-100"},
            "feature_weights": WEIGHTS,
            "note": "Weights are node-local and may be retuned per country. The "
                    "band definitions and score range are fixed across the network "
                    "so that scores remain comparable.",
        },
        "forecast_model": {
            "identifier": FORECAST_MODEL,
            "horizon_hours": 6,
            "output": "risk trajectory with per-step uncertainty bounds",
        },
        "exchanged_entities": [
            {"entity": "hotspot_aggregate", "personal_data": False,
             "detail": "Location, risk band, pollution class, confidence, exposure estimate"},
            {"entity": "regional_indicator", "personal_data": False,
             "detail": "Hourly aggregate risk, PM2.5/PM10 means, signal counts"},
            {"entity": "model_representation", "personal_data": False,
             "detail": "Feature weights and calibration curves — not training data"},
            {"entity": "event_taxonomy", "personal_data": False,
             "detail": "Shared pollution event classes for comparable attribution"},
        ],
        "never_exchanged": [
            "Raw citizen reports",
            "Citizen-uploaded imagery",
            "User identities, contact details, or precise home locations",
            "Device identifiers",
        ],
    }


def _principles() -> List[Dict[str, str]]:
    return [
        {
            "title": "Data sovereignty by default",
            "detail": "Each member state runs its own node against its own database. "
                      "Citizen data never leaves the country of collection.",
        },
        {
            "title": "Federated model improvement",
            "detail": "Nodes train locally and exchange model representations — feature "
                      "weights and calibration curves — rather than training data, so "
                      "detection quality improves network-wide without pooling raw records.",
        },
        {
            "title": "Comparable, not centralised",
            "detail": "A shared score range, band definition, and event taxonomy make "
                      "readings comparable across borders without a central authority "
                      "owning the pipeline.",
        },
        {
            "title": "Aggregate-only cross-border flow",
            "detail": "Only non-personal aggregates cross a border, which keeps the "
                      "design compatible with divergent national data-protection regimes.",
        },
        {
            "title": "Transboundary awareness",
            "detail": "Pollution crosses borders even when data does not. Sharing "
                      "hotspot aggregates and wind-corridor projections gives "
                      "neighbouring nodes advance warning of inbound events.",
        },
        {
            "title": "Independent deployability",
            "detail": "No country-specific logic exists in the codebase. A node is "
                      "configured entirely through environment variables and its "
                      "region table.",
        },
    ]


def _layers() -> List[Dict[str, str]]:
    return [
        {"layer": "1", "name": "Country Data",
         "detail": "Citizen reports, imagery, low-cost sensors, national reference "
                   "monitoring network, meteorological services"},
        {"layer": "2", "name": "Local Processing",
         "detail": "Validation, geolocation, deduplication, and provenance labelling "
                   "inside the national boundary"},
        {"layer": "3", "name": "Local AI Model",
         "detail": "Multimodal event classification and the node-local risk engine, "
                   "tuned to national emission profiles and thresholds"},
        {"layer": "4", "name": "Interoperability Layer",
         "detail": f"Shared schema v{SCHEMA_VERSION}: ISO identifiers, common risk "
                   "bands, shared event taxonomy, aggregate-only export"},
        {"layer": "5", "name": "BRICS Intelligence Layer",
         "detail": "Cross-border situational picture, transboundary corridor tracking, "
                   "and federated model representation exchange"},
    ]


@router.get("/nodes/{country_code}")
def node_detail(country_code: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Detail for one member state's node."""
    code = country_code.upper()[:2]
    regions = db.scalars(select(Region).where(Region.country_code == code)).all()
    if not regions:
        raise HTTPException(status_code=404, detail=f"No node registered for country '{code}'")

    payload = []
    for region in regions:
        hotspots = db.scalars(
            select(Hotspot).where(
                Hotspot.region_code == region.region_code, Hotspot.status == "ACTIVE"
            )
        ).all()
        reports = db.scalars(
            select(CitizenReport).where(CitizenReport.region_code == region.region_code)
        ).all()
        payload.append(
            {
                "region_code": region.region_code,
                "name": region.name,
                "center": [region.center_lat, region.center_lon],
                "timezone": region.timezone_name,
                "node_status": region.node_status,
                "data_mode": region.data_mode,
                "population_millions": region.population_millions,
                "active_hotspots": len(hotspots),
                "citizen_signals": len(reports),
                "risk_distribution": {
                    band: sum(1 for h in hotspots if h.risk_level == band)
                    for band in ("LOW", "MODERATE", "HIGH", "CRITICAL")
                },
            }
        )

    return {
        "country_code": code,
        "country_name": regions[0].country_name,
        "flag": regions[0].flag,
        "schema_version": SCHEMA_VERSION,
        "model_version": MODEL_VERSION,
        "is_home_node": code == settings.default_country_code,
        "regions": payload,
    }
