"""Deterministic multi-signal risk fusion engine.

The engine turns heterogeneous evidence into a single 0-100 pollution risk
score *and*, critically, into a per-factor contribution breakdown so the score
is explainable rather than an opaque number.

Method
------
Each input is normalised to a 0-1 sub-score, then combined as a weighted mean:

    risk = 100 * SUM(w_i * s_i) / SUM(w_i)

Contribution share for factor i is `w_i * s_i / SUM(w_j * s_j)`, i.e. how much
of the realised risk mass that factor actually accounts for — not merely its
static weight. A factor with a high weight but a benign reading correctly
contributes little.

Only factors with available evidence participate, and the weights of missing
inputs are excluded from the denominator, so a sparse report is not silently
penalised or inflated.

Confidence is computed separately from risk and reflects evidence *quality*:
how many independent channels agree, whether they are measured or modelled,
and how much they disagree with each other.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Sequence

from app.services.pollution_service import WHO_PM25_GUIDELINE, pm25_to_aqi
from app.utils.geo import haversine_km

# Static prior weights. These are model hyper-parameters, tuned for the
# prototype and exposed here rather than buried in the scoring loop.
WEIGHTS: Dict[str, float] = {
    "pm25": 0.28,
    "pm10": 0.10,
    "citizen_density": 0.16,
    "visual_severity": 0.14,
    "dispersion": 0.16,
    "satellite": 0.10,
    "historical": 0.06,
}

FACTOR_LABELS: Dict[str, str] = {
    "pm25": "PM2.5 Concentration",
    "pm10": "PM10 Concentration",
    "citizen_density": "Citizen Signal Density",
    "visual_severity": "Visual Event Severity",
    "dispersion": "Atmospheric Dispersion",
    "satellite": "Satellite Aerosol Signal",
    "historical": "Historical Event Similarity",
}

_SEVERITY_SCORE = {"low": 0.2, "moderate": 0.48, "high": 0.75, "severe": 0.95}

RISK_BANDS: Sequence[tuple[float, str]] = (
    (75.0, "CRITICAL"),
    (55.0, "HIGH"),
    (35.0, "MODERATE"),
    (0.0, "LOW"),
)


def risk_level(score: float) -> str:
    for threshold, label in RISK_BANDS:
        if score >= threshold:
            return label
    return "LOW"


@dataclass
class RiskInputs:
    latitude: float
    longitude: float
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    pm_data_mode: str = "SIMULATED"
    pm_provenance: str = ""
    citizen_reports_nearby: int = 0
    citizen_radius_km: float = 3.0
    visual_severity: Optional[str] = None
    visual_confidence: float = 0.0
    dispersion_index: Optional[float] = None
    wind_speed_ms: Optional[float] = None
    aerosol_optical_depth: Optional[float] = None
    thermal_anomalies: int = 0
    historical_similarity: Optional[float] = None
    event_type: str = "unknown"
    extra: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RiskResult:
    risk_score: float
    risk_level: str
    hotspot_probability: float
    confidence: float
    contributions: List[Dict[str, Any]]
    sub_scores: Dict[str, float]
    aqi: int
    aqi_category: str
    who_exceedance: float
    signals_used: int

    def as_dict(self) -> Dict[str, Any]:
        return {
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "hotspot_probability": self.hotspot_probability,
            "confidence": self.confidence,
            "contributions": self.contributions,
            "sub_scores": self.sub_scores,
            "aqi": self.aqi,
            "aqi_category": self.aqi_category,
            "who_exceedance": self.who_exceedance,
            "signals_used": self.signals_used,
        }


# --------------------------------------------------------------------------
# Normalisation helpers — each maps raw evidence onto 0-1
# --------------------------------------------------------------------------
def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def _score_pm25(pm25: float) -> float:
    """Anchored on the WHO 24-hour guideline (15 ug/m3).

    Saturates near 10x the guideline, matching the point at which incremental
    concentration no longer changes the operational response.
    """
    ratio = pm25 / WHO_PM25_GUIDELINE
    return _clamp01(math.log1p(ratio) / math.log1p(10.0))


def _score_pm10(pm10: float) -> float:
    return _clamp01(math.log1p(pm10 / 45.0) / math.log1p(9.0))


def _score_density(count: int, radius_km: float) -> float:
    """Reports per 10 km^2, saturating at ~6 concurrent independent signals."""
    area = max(math.pi * radius_km**2, 1.0)
    density = count / area * 10.0
    return _clamp01(1.0 - math.exp(-density / 2.2))


def _score_dispersion(dispersion_index: Optional[float], wind_speed: Optional[float]) -> float:
    """Poor dispersion => high risk contribution, so this is inverted."""
    if dispersion_index is None:
        if wind_speed is None:
            return 0.5
        dispersion_index = _clamp01(wind_speed / 6.0)
    return _clamp01(1.0 - dispersion_index)


def _score_satellite(aod: Optional[float], thermal: int) -> float:
    aod_component = _clamp01(((aod or 0.2) - 0.1) / 0.8)
    thermal_component = _clamp01(thermal / 8.0)
    return _clamp01(0.7 * aod_component + 0.3 * thermal_component)


# --------------------------------------------------------------------------
# Core scoring
# --------------------------------------------------------------------------
def compute_risk(inputs: RiskInputs) -> RiskResult:
    sub_scores: Dict[str, float] = {}
    details: Dict[str, str] = {}

    if inputs.pm25 is not None:
        sub_scores["pm25"] = _score_pm25(inputs.pm25)
        details["pm25"] = (
            f"{inputs.pm25:.0f} ug/m3 — {inputs.pm25 / WHO_PM25_GUIDELINE:.1f}x the WHO "
            f"24-hour guideline, from "
            f"{inputs.pm_provenance or inputs.pm_data_mode.lower() + ' data'}"
        )

    if inputs.pm10 is not None:
        sub_scores["pm10"] = _score_pm10(inputs.pm10)
        details["pm10"] = f"{inputs.pm10:.0f} ug/m3 coarse particulate loading"

    if inputs.citizen_reports_nearby > 0:
        sub_scores["citizen_density"] = _score_density(
            inputs.citizen_reports_nearby, inputs.citizen_radius_km
        )
        details["citizen_density"] = (
            f"{inputs.citizen_reports_nearby} independent citizen report(s) within "
            f"{inputs.citizen_radius_km:.0f} km in the recent window"
        )

    if inputs.visual_severity:
        sub_scores["visual_severity"] = _SEVERITY_SCORE.get(
            inputs.visual_severity.lower(), 0.5
        )
        details["visual_severity"] = (
            f"AI image analysis rated the visible event '{inputs.visual_severity}' "
            f"at {inputs.visual_confidence * 100:.0f}% classification confidence"
        )

    if inputs.dispersion_index is not None or inputs.wind_speed_ms is not None:
        sub_scores["dispersion"] = _score_dispersion(
            inputs.dispersion_index, inputs.wind_speed_ms
        )
        wind_text = (
            f"{inputs.wind_speed_ms:.1f} m/s wind"
            if inputs.wind_speed_ms is not None
            else "limited ventilation"
        )
        quality = "poor" if sub_scores["dispersion"] > 0.6 else "adequate"
        details["dispersion"] = (
            f"{wind_text}; {quality} dispersion conditions for local emissions"
        )

    if inputs.aerosol_optical_depth is not None or inputs.thermal_anomalies:
        sub_scores["satellite"] = _score_satellite(
            inputs.aerosol_optical_depth, inputs.thermal_anomalies
        )
        details["satellite"] = (
            f"Column aerosol depth {inputs.aerosol_optical_depth or 0:.2f}"
            + (
                f" with {inputs.thermal_anomalies} nearby thermal anomaly detection(s)"
                if inputs.thermal_anomalies
                else ""
            )
        )

    if inputs.historical_similarity is not None:
        sub_scores["historical"] = _clamp01(inputs.historical_similarity)
        details["historical"] = (
            f"{inputs.historical_similarity * 100:.0f}% similarity to previously "
            "confirmed events at this location and hour"
        )

    if not sub_scores:
        # No evidence at all — return an explicit, honest null assessment.
        return RiskResult(
            risk_score=0.0,
            risk_level="LOW",
            hotspot_probability=0.0,
            confidence=0.0,
            contributions=[],
            sub_scores={},
            aqi=0,
            aqi_category="Unknown",
            who_exceedance=0.0,
            signals_used=0,
        )

    weighted = {k: WEIGHTS[k] * v for k, v in sub_scores.items()}
    available_weight = sum(WEIGHTS[k] for k in sub_scores)
    risk = 100.0 * sum(weighted.values()) / available_weight

    total_mass = sum(weighted.values()) or 1.0
    contributions = [
        {
            "factor": key,
            "label": FACTOR_LABELS[key],
            "weight_pct": round(value / total_mass * 100.0, 1),
            "detail": details.get(key, ""),
            "direction": "increase" if sub_scores[key] >= 0.5 else "decrease",
        }
        for key, value in sorted(weighted.items(), key=lambda kv: kv[1], reverse=True)
    ]

    confidence = _compute_confidence(sub_scores, inputs)
    probability = _hotspot_probability(risk, len(sub_scores), confidence)
    pm25_value = inputs.pm25 if inputs.pm25 is not None else 0.0
    aqi, category = pm25_to_aqi(pm25_value)

    return RiskResult(
        risk_score=round(min(99.0, max(1.0, risk)), 1),
        risk_level=risk_level(risk),
        hotspot_probability=probability,
        confidence=confidence,
        contributions=contributions,
        sub_scores={k: round(v, 3) for k, v in sub_scores.items()},
        aqi=aqi,
        aqi_category=category,
        who_exceedance=round(pm25_value / WHO_PM25_GUIDELINE, 1) if pm25_value else 0.0,
        signals_used=len(sub_scores),
    )


def _compute_confidence(sub_scores: Dict[str, float], inputs: RiskInputs) -> float:
    """Evidence quality, deliberately independent of the risk magnitude.

    Three multiplicative components:
      * breadth   — how many independent channels contributed
      * provenance— measured data counts for more than modelled data
      * agreement — tight spread across channels raises confidence
    """
    breadth = _clamp01(len(sub_scores) / 6.0)

    provenance = 0.55
    if inputs.pm_data_mode == "LIVE":
        provenance += 0.2
    if inputs.visual_confidence > 0:
        provenance += 0.15 * inputs.visual_confidence
    if inputs.citizen_reports_nearby >= 3:
        provenance += 0.1
    provenance = _clamp01(provenance)

    values = list(sub_scores.values())
    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    agreement = _clamp01(1.0 - math.sqrt(variance) * 1.6)

    confidence = 0.35 * breadth + 0.35 * provenance + 0.30 * agreement
    # Never claim near-certainty from a prototype fusion model.
    return round(min(0.94, max(0.15, confidence)), 2)


def _hotspot_probability(risk: float, signal_count: int, confidence: float) -> float:
    """Logistic mapping from risk to P(this is a genuine hyperlocal hotspot).

    Centred at 58/100 so the inflection sits just inside the HIGH band; the
    slope is moderated by evidence breadth and confidence so a high score built
    on one thin signal does not assert a near-certain hotspot.
    """
    evidence_gain = 0.6 + 0.12 * min(signal_count, 5) + 0.4 * confidence
    logit = (risk - 58.0) / 11.0 * evidence_gain
    return round(_clamp01(1.0 / (1.0 + math.exp(-logit))), 2)


# --------------------------------------------------------------------------
# Supporting queries used to build RiskInputs from the database
# --------------------------------------------------------------------------
def count_nearby_reports(
    reports: Sequence[Any],
    latitude: float,
    longitude: float,
    radius_km: float = 3.0,
    hours: int = 12,
    exclude_id: Optional[int] = None,
) -> int:
    """Independent citizen signals near a point within a recent time window."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    count = 0
    for report in reports:
        if exclude_id is not None and report.id == exclude_id:
            continue
        created = report.created_at
        if created is None:
            continue
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        if created < cutoff:
            continue
        if haversine_km(latitude, longitude, report.latitude, report.longitude) <= radius_km:
            count += 1
    return count


def historical_similarity(
    records: Sequence[Any],
    current_risk_proxy: float,
    hour_of_day: Optional[int] = None,
) -> Optional[float]:
    """How closely current conditions resemble prior elevated days here.

    Uses the historical daily aggregate series as a weak prior: the fraction of
    recent days whose average risk was within 12 points of the current proxy,
    blended with a diurnal term for the hours that historically run hottest.
    """
    if not records:
        return None
    matches = sum(1 for r in records if abs(r.avg_risk_score - current_risk_proxy) <= 12.0)
    base = matches / len(records)
    if hour_of_day is not None and hour_of_day in (7, 8, 9, 19, 20, 21, 22):
        base = min(1.0, base + 0.15)
    return round(_clamp01(base), 2)


def population_exposed(risk_score: float, radius_km: float, density_per_km2: float = 11_300.0) -> int:
    """Rough exposure estimate for the affected radius.

    Density defaults to a dense-urban figure; a production deployment would
    intersect the hotspot polygon with a gridded population raster (e.g.
    WorldPop) instead of using a uniform assumption.
    """
    area = math.pi * radius_km**2
    intensity = _clamp01((risk_score - 25.0) / 75.0)
    return int(area * density_per_km2 * (0.35 + 0.65 * intensity))


def radius_for_risk(risk_score: float, wind_speed_ms: Optional[float]) -> float:
    """Affected radius grows with severity and with transport wind speed."""
    base = 1.0 + (risk_score / 100.0) * 2.5
    transport = 0.15 * (wind_speed_ms or 2.0)
    return round(min(6.5, base + transport), 2)
