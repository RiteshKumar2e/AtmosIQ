"""Deterministic demonstration data.

Everything generated here is synthetic and labelled `SIMULATED` or `MODELLED`
so the interface can badge it honestly. A fixed RNG seed makes the dataset
reproducible: every developer and every judge sees an identical database.

Run directly with:  python -m app.database.seed [--force]
"""

from __future__ import annotations

import json
import random
import sys
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Sequence, Tuple

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database.session import SessionLocal, init_db
from app.models.models import (
    AIAssessment,
    Alert,
    CitizenReport,
    Hotspot,
    MonitoringStation,
    PollutionRecord,
    Region,
    SensorReading,
    User,
)
from app.services import gemini_service, pollution_service, satellite_service, weather_service
from app.services.risk_engine import (
    RiskInputs,
    compute_risk,
    population_exposed,
    radius_for_risk,
)
from app.utils.security import hash_password

SEED = 20260815
HISTORY_DAYS = 90


# --------------------------------------------------------------------------
# Reference data
# --------------------------------------------------------------------------
REGIONS: List[Dict] = [
    {
        "region_code": "IN-DL", "name": "Delhi NCR", "country_code": "IN",
        "country_name": "India", "flag": "🇮🇳", "center_lat": 28.6139,
        "center_lon": 77.2090, "population_millions": 32.9,
        "timezone_name": "Asia/Kolkata", "node_status": "ACTIVE",
    },
    {
        "region_code": "BR-SP", "name": "São Paulo", "country_code": "BR",
        "country_name": "Brazil", "flag": "🇧🇷", "center_lat": -23.5505,
        "center_lon": -46.6333, "population_millions": 22.4,
        "timezone_name": "America/Sao_Paulo", "node_status": "PILOT",
    },
    {
        "region_code": "RU-MOW", "name": "Moscow Oblast", "country_code": "RU",
        "country_name": "Russia", "flag": "🇷🇺", "center_lat": 55.7558,
        "center_lon": 37.6173, "population_millions": 21.5,
        "timezone_name": "Europe/Moscow", "node_status": "PLANNED",
    },
    {
        "region_code": "CN-BJ", "name": "Beijing", "country_code": "CN",
        "country_name": "China", "flag": "🇨🇳", "center_lat": 39.9042,
        "center_lon": 116.4074, "population_millions": 21.9,
        "timezone_name": "Asia/Shanghai", "node_status": "PILOT",
    },
    {
        "region_code": "ZA-GP", "name": "Gauteng", "country_code": "ZA",
        "country_name": "South Africa", "flag": "🇿🇦", "center_lat": -26.2041,
        "center_lon": 28.0473, "population_millions": 15.8,
        "timezone_name": "Africa/Johannesburg", "node_status": "PILOT",
    },
]

# Named locations with a plausible dominant emission character.
LOCATIONS: Dict[str, List[Tuple[str, float, float, str]]] = {
    "IN-DL": [
        ("Anand Vihar", 28.6469, 77.3152, "traffic"),
        ("Okhla Industrial Area", 28.5355, 77.2730, "industrial"),
        ("Wazirpur Industrial Area", 28.6975, 77.1600, "industrial"),
        ("Bawana Industrial Area", 28.7960, 77.0480, "industrial"),
        ("Mundka", 28.6820, 77.0300, "waste"),
        ("Narela", 28.8530, 77.0920, "industrial"),
        ("Rohini Sector 16", 28.7360, 77.1200, "construction"),
        ("Dwarka Sector 8", 28.5920, 77.0460, "construction"),
        ("Mayapuri Industrial Area", 28.6280, 77.1250, "industrial"),
        ("ITO Junction", 28.6280, 77.2410, "traffic"),
        ("Ashram Chowk", 28.5720, 77.2590, "traffic"),
        ("Ghazipur Landfill", 28.6200, 77.3260, "waste"),
        ("Bhalswa Landfill", 28.7420, 77.1620, "waste"),
        ("Sahibabad Industrial Area", 28.6800, 77.3600, "industrial"),
        ("Faridabad Sector 24", 28.3800, 77.3100, "industrial"),
        ("Noida Sector 62", 28.6270, 77.3730, "construction"),
        ("Udyog Vihar, Gurugram", 28.5020, 77.0870, "industrial"),
        ("Punjabi Bagh", 28.6680, 77.1310, "traffic"),
        ("Jahangirpuri", 28.7280, 77.1620, "waste"),
        ("Shahdara", 28.6730, 77.2890, "traffic"),
        ("Nangloi", 28.6820, 77.0680, "agriculture"),
        ("Alipur", 28.7980, 77.1370, "agriculture"),
        ("Vasant Kunj", 28.5200, 77.1590, "construction"),
        ("Karol Bagh", 28.6510, 77.1900, "traffic"),
    ],
    "BR-SP": [
        ("Cubatão Industrial Zone", -23.8950, -46.4250, "industrial"),
        ("Marginal Tietê", -23.5180, -46.6400, "traffic"),
        ("Osasco", -23.5320, -46.7920, "industrial"),
        ("Guarulhos", -23.4540, -46.5330, "traffic"),
    ],
    "RU-MOW": [
        ("Kapotnya Refinery Belt", 55.6350, 37.7960, "industrial"),
        ("MKAD South", 55.5900, 37.6100, "traffic"),
        ("Lyubertsy", 55.6780, 37.8930, "industrial"),
    ],
    "CN-BJ": [
        ("Shijingshan Industrial Belt", 39.9060, 116.1950, "industrial"),
        ("Tongzhou Construction Zone", 39.9090, 116.6570, "construction"),
        ("Fourth Ring Road East", 39.9280, 116.4820, "traffic"),
        ("Daxing", 39.7290, 116.3380, "agriculture"),
    ],
    "ZA-GP": [
        ("Vanderbijlpark Steel Belt", -26.7100, 27.8380, "industrial"),
        ("Soweto", -26.2678, 27.8585, "waste"),
        ("Germiston", -26.2180, 28.1670, "industrial"),
        ("Pretoria Central", -25.7479, 28.2293, "traffic"),
    ],
}

STATIONS: Dict[str, List[Tuple[str, str, float, float, str]]] = {
    "IN-DL": [
        ("DL001", "Anand Vihar Reference Station", 28.6469, 77.3152, "CPCB"),
        ("DL002", "Punjabi Bagh Reference Station", 28.6680, 77.1310, "DPCC"),
        ("DL003", "R.K. Puram Reference Station", 28.5630, 77.1870, "CPCB"),
        ("DL004", "Dwarka Sector 8 Reference Station", 28.5710, 77.0710, "DPCC"),
        ("DL005", "ITO Reference Station", 28.6280, 77.2410, "CPCB"),
        ("DL006", "Jahangirpuri Reference Station", 28.7280, 77.1620, "DPCC"),
        ("DL007", "Rohini Reference Station", 28.7325, 77.1195, "DPCC"),
        ("DL008", "Sirifort Reference Station", 28.5504, 77.2159, "CPCB"),
    ],
    "BR-SP": [
        ("BR001", "Ibirapuera Reference Station", -23.5910, -46.6600, "CETESB"),
        ("BR002", "Congonhas Reference Station", -23.6160, -46.6630, "CETESB"),
        ("BR003", "Cubatão Reference Station", -23.8790, -46.4180, "CETESB"),
    ],
    "RU-MOW": [
        ("RU001", "Kapotnya Monitoring Post", 55.6380, 37.7930, "Mosecomonitoring"),
        ("RU002", "Ostankino Monitoring Post", 55.8210, 37.6110, "Mosecomonitoring"),
    ],
    "CN-BJ": [
        ("CN001", "Dongsi Reference Station", 39.9290, 116.4170, "Beijing MEMC"),
        ("CN002", "Haidian Wanliu Reference Station", 39.9870, 116.2870, "Beijing MEMC"),
        ("CN003", "Tongzhou Reference Station", 39.8860, 116.6630, "Beijing MEMC"),
    ],
    "ZA-GP": [
        ("ZA001", "Johannesburg CBD Station", -26.2041, 28.0473, "SAAQIS"),
        ("ZA002", "Vanderbijlpark Station", -26.7050, 27.8400, "SAAQIS"),
    ],
}

CHARACTER_TO_REPORT_TYPE = {
    "industrial": "industrial_emission",
    "traffic": "smog",
    "construction": "dust",
    "waste": "burning",
    "agriculture": "burning",
}

# Local enhancement over the regional background concentration.
#
# This is the entire premise of hyperlocal monitoring: a landfill fire or an
# uncontrolled stack produces concentrations far above the city-wide average
# that a distant reference station reports. Modelling every location at the
# regional mean would make the platform's own reason for existing invisible.
# Values are order-of-magnitude consistent with published near-source
# measurements for each source class.
LOCAL_ENHANCEMENT = {
    "industrial": 2.1,
    "waste": 2.6,
    "agriculture": 2.0,
    "construction": 1.7,
    "traffic": 1.5,
}

# Source classes whose emissions are combustion-based, and therefore visible to
# satellite thermal-anomaly detection.
COMBUSTION_SOURCES = {"waste", "agriculture", "industrial"}

DESCRIPTIONS: Dict[str, List[str]] = {
    "industrial": [
        "Dense grey smoke coming from the factory chimney since early morning. "
        "Strong chemical smell across the whole block.",
        "The industrial unit behind our lane has been releasing dark smoke for "
        "hours. Windows have a fine grey film on them.",
        "Continuous emission from the plant stack. The smoke is not dispersing, "
        "it is settling low over the houses.",
        "Thick white-grey plume from the industrial estate. Visibility along the "
        "service road is clearly reduced.",
    ],
    "traffic": [
        "Heavy congestion at the junction with visible brown haze over the road. "
        "Eyes are burning while waiting to cross.",
        "Persistent smog along the corridor during peak hours. Cannot see the far "
        "end of the flyover.",
        "Very poor visibility at the intersection this evening, strong exhaust "
        "smell from queued vehicles.",
    ],
    "construction": [
        "Construction site with no dust barriers. Fine dust is blowing across the "
        "footpath and into the housing block.",
        "Demolition work with no water sprinkling. A thick brown dust cloud covers "
        "the entire street.",
        "Uncovered aggregate and debris being loaded, dust is drifting toward the "
        "school opposite.",
    ],
    "waste": [
        "Garbage is being burnt openly at the dump site. Black acrid smoke drifting "
        "into the residential area.",
        "Waste pile burning near the landfill boundary. Very strong plastic-burning "
        "smell for the last hour.",
        "Open refuse fire behind the market with dark uneven smoke.",
    ],
    "agriculture": [
        "Crop residue being burnt in the fields on the outskirts. Low smoke layer "
        "spread across the whole area.",
        "Stubble burning visible across several fields. Smoke is sitting close to "
        "the ground and not lifting.",
        "Wide smoke front from field burning drifting toward the highway.",
    ],
}


# --------------------------------------------------------------------------
# Seeding
# --------------------------------------------------------------------------
def _is_seeded(db: Session) -> bool:
    return (db.scalar(select(func.count()).select_from(Region)) or 0) > 0


def seed(db: Session, *, force: bool = False) -> Dict[str, int]:
    if _is_seeded(db) and not force:
        return {"skipped": 1}

    if force:
        _wipe(db)

    rng = random.Random(SEED)
    now = datetime.now(timezone.utc)

    regions = _seed_regions(db)
    users = _seed_users(db)
    stations = _seed_stations(db, regions)
    readings = _seed_sensor_readings(db, stations, rng, now)
    history = _seed_history(db, regions, rng, now)
    reports, assessments = _seed_reports(db, regions, users, rng, now)
    hotspots = _seed_hotspots(db, reports, assessments, rng, now)
    alerts = _seed_alerts(db, hotspots, rng, now)

    db.commit()
    return {
        "regions": len(regions),
        "users": len(users),
        "stations": len(stations),
        "sensor_readings": readings,
        "history_records": history,
        "reports": len(reports),
        "assessments": len(assessments),
        "hotspots": len(hotspots),
        "alerts": len(alerts),
    }


def _wipe(db: Session) -> None:
    for model in (Alert, Hotspot, AIAssessment, CitizenReport, SensorReading,
                  MonitoringStation, PollutionRecord, Region, User):
        for row in db.scalars(select(model)).all():
            db.delete(row)
    db.commit()


def _seed_regions(db: Session) -> Dict[str, Region]:
    out: Dict[str, Region] = {}
    for spec in REGIONS:
        region = Region(**spec, data_mode="SIMULATED")
        db.add(region)
        out[spec["region_code"]] = region
    db.flush()
    return out


def _seed_users(db: Session) -> List[User]:
    from app.api.auth import DEMO_ACCOUNTS, DEMO_PASSWORD

    users: List[User] = []
    for role, profile in DEMO_ACCOUNTS.items():
        user = User(
            name=profile["name"],
            email=profile["email"],
            password_hash=hash_password(DEMO_PASSWORD),
            role=role,
            organisation=profile["organisation"],
            country_code=settings.default_country_code,
            region_code=settings.default_region_code,
            is_demo=True,
        )
        db.add(user)
        users.append(user)

    # A handful of named citizen personas so the reports feed does not look
    # like it came from a single account.
    for name, email, region_code, country_code in [
        ("Priya Sharma", "priya.sharma@aeroshield.demo", "IN-DL", "IN"),
        ("Rahul Verma", "rahul.verma@aeroshield.demo", "IN-DL", "IN"),
        ("Ananya Iyer", "ananya.iyer@aeroshield.demo", "IN-DL", "IN"),
        ("Carlos Mendes", "carlos.mendes@aeroshield.demo", "BR-SP", "BR"),
        ("Lena Petrova", "lena.petrova@aeroshield.demo", "RU-MOW", "RU"),
        ("Wei Zhang", "wei.zhang@aeroshield.demo", "CN-BJ", "CN"),
        ("Thabo Nkosi", "thabo.nkosi@aeroshield.demo", "ZA-GP", "ZA"),
    ]:
        user = User(
            name=name,
            email=email,
            password_hash=hash_password(DEMO_PASSWORD),
            role="citizen",
            organisation=None,
            country_code=country_code,
            region_code=region_code,
            is_demo=True,
        )
        db.add(user)
        users.append(user)

    db.flush()
    return users


def _seed_stations(db: Session, regions: Dict[str, Region]) -> List[MonitoringStation]:
    stations: List[MonitoringStation] = []
    for region_code, entries in STATIONS.items():
        region = regions[region_code]
        for code, name, lat, lon, operator in entries:
            station = MonitoringStation(
                station_code=code,
                name=name,
                latitude=lat,
                longitude=lon,
                country_code=region.country_code,
                region_code=region_code,
                operator=operator,
                coverage_radius_km=5.0,
                status="ONLINE",
                data_mode="SIMULATED",
            )
            db.add(station)
            stations.append(station)
    db.flush()
    return stations


def _seed_sensor_readings(
    db: Session, stations: Sequence[MonitoringStation], rng: random.Random, now: datetime
) -> int:
    """Hourly readings for the last 48 hours at every station."""
    count = 0
    for station in stations:
        for hours_ago in range(48, -1, -1):
            moment = now - timedelta(hours=hours_ago)
            air = pollution_service.get_air_quality_sync(
                station.latitude, station.longitude, hour=moment.hour
            )
            weather = weather_service.get_weather_sync(station.latitude, station.longitude)
            jitter = rng.uniform(0.88, 1.14)

            db.add(
                SensorReading(
                    station_id=station.id,
                    latitude=station.latitude,
                    longitude=station.longitude,
                    country_code=station.country_code,
                    region_code=station.region_code,
                    pm25=round(air["pm25"] * jitter, 1),
                    pm10=round(air["pm10"] * jitter, 1),
                    no2=air.get("no2"),
                    so2=air.get("so2"),
                    temperature=round(weather["temperature"] + rng.uniform(-1.5, 1.5), 1),
                    humidity=round(
                        min(99.0, max(10.0, weather["humidity"] + rng.uniform(-6, 6))), 1
                    ),
                    wind_speed_ms=round(
                        max(0.2, weather["wind_speed_ms"] + rng.uniform(-0.8, 0.8)), 1
                    ),
                    wind_direction_deg=weather["wind_direction_deg"],
                    source="STATION",
                    data_mode="SIMULATED",
                    timestamp=moment,
                )
            )
            count += 1
    db.flush()
    return count


def _seed_history(
    db: Session, regions: Dict[str, Region], rng: random.Random, now: datetime
) -> int:
    """Daily aggregates that the forecast climatology and trends learn from."""
    count = 0
    for region in regions.values():
        for days_ago in range(HISTORY_DAYS, 0, -1):
            day = now - timedelta(days=days_ago)
            air = pollution_service.get_air_quality_sync(
                region.center_lat, region.center_lon, hour=12
            )
            # Winter accumulation is a real feature of several BRICS airsheds;
            # a seasonal term keeps the trend chart plausible.
            seasonal = 1.0 + 0.32 * (1 if day.month in (11, 12, 1, 2) else 0)
            weekday = 0.92 if day.weekday() >= 5 else 1.0
            pm25 = round(air["pm25"] * seasonal * weekday * rng.uniform(0.82, 1.2), 1)
            pm10 = round(pm25 * rng.uniform(1.6, 2.1), 1)
            risk = round(min(96.0, 16.0 + pm25 * 0.42 + rng.uniform(-5, 6)), 1)

            db.add(
                PollutionRecord(
                    country_code=region.country_code,
                    region_code=region.region_code,
                    recorded_on=day,
                    avg_pm25=pm25,
                    avg_pm10=pm10,
                    avg_risk_score=risk,
                    hotspot_count=max(0, int(risk / 22) + rng.randint(-1, 2)),
                    report_count=max(0, int(risk / 12) + rng.randint(-2, 4)),
                    dominant_source=rng.choice(
                        ["industrial", "traffic", "agriculture", "construction", "waste"]
                    ),
                    data_mode="SIMULATED",
                )
            )
            count += 1
    db.flush()
    return count


def _seed_reports(
    db: Session,
    regions: Dict[str, Region],
    users: Sequence[User],
    rng: random.Random,
    now: datetime,
) -> Tuple[List[CitizenReport], List[AIAssessment]]:
    reports: List[CitizenReport] = []
    assessments: List[AIAssessment] = []

    citizens_by_region: Dict[str, List[User]] = {}
    for user in users:
        citizens_by_region.setdefault(user.region_code, []).append(user)

    for region_code, places in LOCATIONS.items():
        region = regions[region_code]
        # The home node carries the bulk of the demonstration data.
        per_place = 1 if region_code == settings.default_region_code else 1
        for name, lat, lon, character in places:
            for _ in range(per_place):
                hours_ago = rng.randint(1, 96)
                created = now - timedelta(hours=hours_ago, minutes=rng.randint(0, 59))
                report_type = CHARACTER_TO_REPORT_TYPE[character]
                description = rng.choice(DESCRIPTIONS[character])
                candidates = citizens_by_region.get(region_code) or list(users)
                reporter = rng.choice(candidates)

                background = pollution_service.get_air_quality_sync(
                    lat, lon, hour=created.hour
                )
                # How strongly the local source is emitting right now. Most
                # reports catch a routine day; a minority catch a real event.
                intensity = rng.choices(
                    [rng.uniform(0.55, 0.95), rng.uniform(0.95, 1.5), rng.uniform(1.5, 2.3)],
                    weights=[0.45, 0.35, 0.20],
                )[0]
                air = _local_air(background, character, intensity)
                has_sensor = rng.random() < 0.45

                report = CitizenReport(
                    user_id=reporter.id,
                    latitude=round(lat + rng.uniform(-0.006, 0.006), 6),
                    longitude=round(lon + rng.uniform(-0.006, 0.006), 6),
                    country_code=region.country_code,
                    region_code=region_code,
                    location_label=name,
                    report_type=report_type,
                    description=description,
                    image_url=None,
                    pm25=round(air["pm25"] * rng.uniform(0.9, 1.25), 1) if has_sensor else None,
                    pm10=round(air["pm10"] * rng.uniform(0.9, 1.25), 1) if has_sensor else None,
                    temperature=round(rng.uniform(18, 34), 1) if has_sensor else None,
                    humidity=round(rng.uniform(35, 82), 1) if has_sensor else None,
                    status="ANALYSED",
                    data_mode="SIMULATED",
                    is_demo_seed=True,
                )
                db.add(report)
                db.flush()
                reports.append(report)

                assessment = _build_assessment(
                    db, report, air, created, rng, character=character, intensity=intensity
                )
                assessments.append(assessment)

                report.created_at = created

    db.flush()
    return reports, assessments


def _local_air(background: Dict, character: str, intensity: float) -> Dict:
    """Apply a near-source enhancement to the regional background."""
    factor = LOCAL_ENHANCEMENT[character] * intensity
    pm25 = round(min(480.0, background["pm25"] * factor), 1)
    # Coarse-to-fine ratio depends on the source: dust is PM10-dominated,
    # combustion is PM2.5-dominated.
    ratio = 2.6 if character == "construction" else 1.7
    pm10 = round(min(700.0, pm25 * ratio), 1)
    aqi, category = pollution_service.pm25_to_aqi(pm25)
    return {
        **background,
        "pm25": pm25,
        "pm10": pm10,
        "aqi": aqi,
        "aqi_category": category,
        "who_exceedance": pollution_service.exceedance_factor(pm25),
    }


def _build_assessment(
    db: Session,
    report: CitizenReport,
    air: Dict,
    created: datetime,
    rng: random.Random,
    *,
    character: str,
    intensity: float,
) -> AIAssessment:
    """Score a seeded report through the real risk engine.

    The vision stage uses the deterministic offline analyser rather than
    calling Gemini, so seeding is free, offline, and reproducible. The risk
    engine and explainability are the same code the live pipeline runs.
    """
    weather = weather_service.get_weather_sync(report.latitude, report.longitude)
    satellite = dict(
        satellite_service.get_features_sync(
            report.latitude, report.longitude, hour=created.hour
        )
    )
    # A strongly emitting local source raises the observed aerosol column, and
    # combustion sources register as thermal anomalies.
    satellite["aerosol_optical_depth"] = round(
        min(1.4, satellite["aerosol_optical_depth"] * (0.75 + 0.5 * intensity)), 3
    )
    if character in COMBUSTION_SOURCES and intensity > 1.1:
        satellite["thermal_anomaly_count"] = int(
            satellite["thermal_anomaly_count"] + rng.randint(2, 9) * (intensity - 1.0)
        )

    context = {"weather": weather, "air_quality": air, "satellite": satellite}

    vision = gemini_service.analyze_offline(
        description=report.description,
        report_type=report.report_type,
        context=context,
    )

    risk = compute_risk(
        RiskInputs(
            latitude=report.latitude,
            longitude=report.longitude,
            pm25=air["pm25"],
            pm10=air["pm10"],
            pm_data_mode="SIMULATED",
            # A genuine event draws multiple independent observers; a routine
            # day produces one or two isolated reports.
            citizen_reports_nearby=max(1, int(round(intensity * rng.randint(2, 5)))),
            visual_severity=vision["severity"],
            visual_confidence=vision["confidence"],
            dispersion_index=weather["dispersion_index"],
            wind_speed_ms=weather["wind_speed_ms"],
            aerosol_optical_depth=satellite["aerosol_optical_depth"],
            thermal_anomalies=int(satellite["thermal_anomaly_count"]),
            historical_similarity=round(rng.uniform(0.3, 0.85), 2),
            event_type=vision["event_type"],
        )
    )

    evidence = {
        "citizen": {
            "report_type": report.report_type,
            "description": report.description,
            "location_label": report.location_label,
            "coordinates": [report.latitude, report.longitude],
            "data_mode": "SIMULATED",
        },
        "ambient_air": {
            "pm25": air["pm25"], "pm10": air["pm10"], "aqi": risk.aqi,
            "aqi_category": risk.aqi_category, "who_exceedance": risk.who_exceedance,
            "data_mode": "SIMULATED",
        },
        "weather": weather,
        "satellite": satellite,
        "vision": {
            "event_type": vision["event_type"],
            "event_label": vision["event_label"],
            "severity": vision["severity"],
            "confidence": vision["confidence"],
            "visible_indicators": vision["visible_indicators"],
            "measurement_caveat": vision["measurement_caveat"],
            "provider": "DEMO_MODE",
            "data_mode": "MODELLED",
        },
    }

    explanation = gemini_service.explain_offline(
        risk_level=risk.risk_level,
        contributions=risk.contributions,
        evidence=evidence,
        event_type=vision["event_type"],
    )
    summary = explanation["summary"]
    forecast_note = explanation["forecast_note"]

    assessment = AIAssessment(
        report_id=report.id,
        event_type=vision["event_type"],
        severity=vision["severity"],
        risk_score=risk.risk_score,
        risk_level=risk.risk_level,
        hotspot_probability=risk.hotspot_probability,
        confidence=risk.confidence,
        likely_source=vision["possible_source"],
        ai_summary=summary,
        recommended_action=vision["recommended_action"],
        visible_indicators=json.dumps(vision["visible_indicators"]),
        environmental_concerns=json.dumps(vision["environmental_concerns"]),
        contributions=json.dumps(risk.contributions),
        evidence=json.dumps(evidence, default=str),
        forecast_note=forecast_note,
        ai_provider="DEMO_MODE",
        model_name=vision["model_name"],
        analysis_ms=rng.randint(700, 2400),
        created_at=created,
    )
    db.add(assessment)
    db.flush()
    return assessment


def _seed_hotspots(
    db: Session,
    reports: Sequence[CitizenReport],
    assessments: Sequence[AIAssessment],
    rng: random.Random,
    now: datetime,
) -> List[Hotspot]:
    """Promote the highest-scoring reports into registered hotspots."""
    by_report = {a.report_id: a for a in assessments}
    ranked = sorted(
        reports,
        key=lambda r: by_report[r.id].risk_score if r.id in by_report else 0.0,
        reverse=True,
    )

    hotspots: List[Hotspot] = []
    used_regions: Dict[str, int] = {}

    for report in ranked:
        assessment = by_report.get(report.id)
        if assessment is None or assessment.hotspot_probability < 0.45:
            continue
        # Cap per region so one airshed does not swamp the map.
        cap = 9 if report.region_code == settings.default_region_code else 3
        if used_regions.get(report.region_code, 0) >= cap:
            continue
        used_regions[report.region_code] = used_regions.get(report.region_code, 0) + 1

        weather = weather_service.get_weather_sync(report.latitude, report.longitude)
        radius = radius_for_risk(assessment.risk_score, weather["wind_speed_ms"])
        detected = now - timedelta(minutes=rng.randint(8, 900))

        hotspot = Hotspot(
            latitude=report.latitude,
            longitude=report.longitude,
            country_code=report.country_code,
            region_code=report.region_code,
            location_label=report.location_label,
            risk_score=assessment.risk_score,
            risk_level=assessment.risk_level,
            hotspot_probability=assessment.hotspot_probability,
            confidence=assessment.confidence,
            pollution_type=assessment.event_type,
            likely_source=assessment.likely_source,
            source="CITIZEN_AI_FUSION",
            radius_km=radius,
            population_exposed=population_exposed(assessment.risk_score, radius),
            signal_count=rng.randint(1, 6),
            forecast_note=assessment.forecast_note,
            forecast_trend=rng.choice(["INCREASING", "STABLE", "STABLE", "DECREASING"]),
            contributions=assessment.contributions,
            ai_summary=assessment.ai_summary,
            recommended_action=assessment.recommended_action,
            report_id=report.id,
            status="ACTIVE",
            data_mode="MODELLED",
            detected_at=detected,
        )
        db.add(hotspot)
        hotspots.append(hotspot)

    db.flush()
    return hotspots


def _seed_alerts(
    db: Session, hotspots: Sequence[Hotspot], rng: random.Random, now: datetime
) -> List[Alert]:
    from app.services.gemini_service import EVENT_LABELS

    alerts: List[Alert] = []
    escalated = [h for h in hotspots if h.risk_score >= 55]
    escalated.sort(key=lambda h: h.risk_score, reverse=True)

    # A realistic mix of queue states so the alert centre is not all-NEW.
    lifecycle = ["NEW", "NEW", "ACKNOWLEDGED", "ASSIGNED", "NEW", "RESOLVED",
                 "ACKNOWLEDGED", "ASSIGNED", "NEW", "RESOLVED"]
    assignees = ["Mobile Monitoring Unit 3", "District Enforcement Team",
                 "Air Quality Inspection Cell", "Zonal Response Unit 1"]

    for index, hotspot in enumerate(escalated[:10]):
        state = lifecycle[index % len(lifecycle)]
        created = hotspot.detected_at + timedelta(minutes=rng.randint(1, 6))
        acknowledged = (
            created + timedelta(minutes=rng.randint(3, 40))
            if state in ("ACKNOWLEDGED", "ASSIGNED", "RESOLVED")
            else None
        )
        resolved = (
            (acknowledged or created) + timedelta(minutes=rng.randint(30, 180))
            if state == "RESOLVED"
            else None
        )

        alert = Alert(
            hotspot_id=hotspot.id,
            severity=hotspot.risk_level,
            title=f"{hotspot.risk_level} RISK POLLUTION EVENT — "
                  f"{EVENT_LABELS.get(hotspot.pollution_type, 'Environmental Event')}",
            description=hotspot.ai_summary,
            location_label=hotspot.location_label,
            country_code=hotspot.country_code,
            region_code=hotspot.region_code,
            risk_score=hotspot.risk_score,
            forecast_trend=hotspot.forecast_trend,
            recommended_action=hotspot.recommended_action,
            status=state,
            assigned_to=rng.choice(assignees) if state in ("ASSIGNED", "RESOLVED") else None,
            acknowledged_at=acknowledged,
            resolved_at=resolved,
            data_mode="MODELLED",
            created_at=created,
        )
        db.add(alert)
        alerts.append(alert)

        if state == "RESOLVED":
            hotspot.status = "RESOLVED"

    db.flush()
    return alerts


def seed_if_empty() -> Optional[Dict[str, int]]:
    """Called on application startup so a fresh clone is never an empty app."""
    db = SessionLocal()
    try:
        if _is_seeded(db):
            return None
        return seed(db)
    finally:
        db.close()


def main() -> None:
    force = "--force" in sys.argv
    init_db()
    db = SessionLocal()
    try:
        result = seed(db, force=force)
        if result.get("skipped"):
            print("Database already contains data. Re-run with --force to reseed.")
            return
        print("Seeded AeroShield demonstration data:")
        for key, value in result.items():
            print(f"  {key:>18}: {value}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
