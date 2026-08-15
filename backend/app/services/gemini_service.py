"""Google Gemini integration — the AI stage of the detection pipeline.

Gemini is used in two distinct, non-decorative roles:

1. `analyze_image()`  — multimodal classification of a citizen's photograph
   into an environmental event type with visible indicators, a visual severity
   band, and a candidate source. This runs *before* scoring and feeds the risk
   engine a real feature vector.

2. `explain_risk()`   — natural-language reasoning over the fused evidence
   (visual + sensor + meteorological + satellite + historical) after the risk
   engine has produced weighted contributions, plus a concrete intervention
   recommendation for the responding authority.

Guardrails baked into the prompts:
  * The model is explicitly told an image cannot measure AQI, and must keep
    visual evidence separate from instrument-measured concentrations.
  * Structured output is enforced with a response schema, so the pipeline
    never has to parse free-form prose.
  * Every field is re-validated and clamped on our side before it is trusted.

Fallback: with no `GOOGLE_GEMINI_API_KEY`, a deterministic local analyser
produces the same schema, labelled `DEMO_MODE`, so the demo never breaks.
"""

from __future__ import annotations

import base64
import hashlib
import json
import logging
import time
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.config import settings

logger = logging.getLogger("aeroshield.gemini")

_API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models"

EVENT_TYPES = [
    "industrial_smoke",
    "agricultural_burning",
    "construction_dust",
    "traffic_pollution",
    "waste_burning",
    "haze_smog",
    "unknown",
]

SEVERITY_LEVELS = ["low", "moderate", "high", "severe"]

EVENT_LABELS = {
    "industrial_smoke": "Industrial Smoke Emission",
    "agricultural_burning": "Agricultural Residue Burning",
    "construction_dust": "Construction Dust",
    "traffic_pollution": "Traffic-Related Pollution",
    "waste_burning": "Open Waste Burning",
    "haze_smog": "Haze / Smog Accumulation",
    "unknown": "Unclassified Environmental Event",
}

_DISCLAIMER = (
    "AI-generated visual assessment. Not a substitute for certified "
    "environmental measurement."
)

# --------------------------------------------------------------------------
# Structured-output schemas (OpenAPI subset accepted by the Gemini API)
# --------------------------------------------------------------------------
_IMAGE_SCHEMA: Dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "event_type": {"type": "STRING", "enum": EVENT_TYPES},
        "visible_indicators": {
            "type": "ARRAY",
            "items": {"type": "STRING"},
            "description": "Concrete things visible in the image only.",
        },
        "severity": {"type": "STRING", "enum": SEVERITY_LEVELS},
        "confidence": {
            "type": "NUMBER",
            "description": "0-1 confidence in the event classification.",
        },
        "possible_source": {"type": "STRING"},
        "environmental_concerns": {"type": "ARRAY", "items": {"type": "STRING"}},
        "recommended_action": {"type": "STRING"},
        "plume_opacity": {
            "type": "STRING",
            "enum": ["none", "light", "moderate", "dense"],
        },
        "visibility_impact": {
            "type": "STRING",
            "enum": ["none", "slight", "reduced", "severe"],
        },
        "image_quality": {"type": "STRING", "enum": ["poor", "fair", "good"]},
        "measurement_caveat": {
            "type": "STRING",
            "description": "Why the image alone cannot establish AQI values.",
        },
    },
    "required": [
        "event_type",
        "visible_indicators",
        "severity",
        "confidence",
        "possible_source",
        "environmental_concerns",
        "recommended_action",
        "measurement_caveat",
    ],
}

_EXPLAIN_SCHEMA: Dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "summary": {
            "type": "STRING",
            "description": "2-3 sentences explaining why the area is at risk.",
        },
        "recommended_action": {
            "type": "STRING",
            "description": "One concrete operational instruction for authorities.",
        },
        "forecast_note": {
            "type": "STRING",
            "description": "One sentence on expected near-term direction.",
        },
        "likely_source": {"type": "STRING"},
    },
    "required": ["summary", "recommended_action", "forecast_note", "likely_source"],
}

_IMAGE_SYSTEM_PROMPT = """You are an environmental monitoring analyst supporting a
government air-quality early-warning platform. You classify citizen-submitted
photographs of suspected pollution events.

Hard rules you must follow:
- A photograph CANNOT measure AQI, PM2.5, or PM10. Never state or imply a
  numeric air-quality value derived from the image.
- Keep visual evidence strictly separate from instrument measurements. Describe
  only what is actually visible (plume colour, opacity, haze, dust, flames,
  stack geometry, haze layering, visibility distance).
- If the image is ambiguous, unrelated to pollution, or too poor to judge, use
  event_type "unknown" and a low confidence value. Do not guess to be helpful.
- `severity` is a VISUAL severity band only, not an air-quality classification.
- `measurement_caveat` must state plainly what the image can and cannot
  establish.
- Be specific and operational. Avoid marketing language.
"""

_EXPLAIN_SYSTEM_PROMPT = """You are an environmental risk analyst writing the
explanation panel of an air-quality early-warning dashboard read by municipal
authorities.

Rules:
- Explain WHY the risk score is what it is, referencing the strongest weighted
  contributors you are given, in plain professional language.
- Distinguish measured values (sensor/reference data) from inferred or visual
  evidence, and from modelled/simulated inputs.
- Never invent data that was not provided to you.
- Recommendations must be concrete operational steps a city agency can take
  (inspection, mobile monitoring deployment, advisory issuance, source
  verification). Never issue autonomous policy decisions — you assist a human
  decision-maker.
- Be concise. No filler, no hype, no emoji.
"""


# --------------------------------------------------------------------------
# Public API
# --------------------------------------------------------------------------
def provider() -> str:
    return settings.ai_provider


async def analyze_image(
    *,
    image_bytes: Optional[bytes],
    mime_type: str = "image/jpeg",
    latitude: float,
    longitude: float,
    description: str = "",
    report_type: str = "other",
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Classify a citizen observation. Always returns a valid, complete dict."""
    started = time.perf_counter()
    context = context or {}

    if settings.gemini_enabled:
        try:
            raw = await _call_gemini_image(
                image_bytes=image_bytes,
                mime_type=mime_type,
                latitude=latitude,
                longitude=longitude,
                description=description,
                report_type=report_type,
                context=context,
            )
            result = _normalise_image_result(raw, report_type)
            result["ai_provider"] = "GEMINI"
            result["model_name"] = settings.gemini_model
            result["analysis_ms"] = int((time.perf_counter() - started) * 1000)
            return result
        except Exception as exc:  # noqa: BLE001 — demo must never hard-fail
            logger.warning("Gemini image analysis failed, using fallback: %s", exc)

    result = _fallback_image_result(
        image_bytes=image_bytes,
        description=description,
        report_type=report_type,
        context=context,
    )
    result["analysis_ms"] = int((time.perf_counter() - started) * 1000)
    return result


def analyze_offline(
    *,
    description: str = "",
    report_type: str = "other",
    context: Optional[Dict[str, Any]] = None,
    image_bytes: Optional[bytes] = None,
) -> Dict[str, Any]:
    """Synchronous deterministic analysis.

    Used by the seeder so populating the demonstration database never issues
    API calls, and by any synchronous call site. Produces the same schema as
    `analyze_image`, always labelled `DEMO_MODE`.
    """
    result = _fallback_image_result(
        image_bytes=image_bytes,
        description=description,
        report_type=report_type,
        context=context or {},
    )
    result["analysis_ms"] = 0
    return result


def explain_offline(
    *,
    risk_level: str,
    contributions: List[Dict[str, Any]],
    evidence: Dict[str, Any],
    event_type: str = "unknown",
) -> Dict[str, Any]:
    """Synchronous deterministic explanation, mirroring `explain_risk`."""
    return {
        "summary": _fallback_summary(risk_level, contributions),
        "recommended_action": _fallback_action(event_type),
        "forecast_note": _fallback_forecast_note(evidence),
        "likely_source": _default_source(event_type),
        "ai_provider": "DEMO_MODE",
        "model_name": "aeroshield-rule-explainer-v1",
    }


#: Narrative explanations, keyed by location and risk band.
#: The dashboard overview calls explain_risk on every page load, so without a
#: cache each visit pays a full model round trip — and, once a quota is
#: exhausted, a slow failing one. The narrative describes a coarse risk band
#: for a place, which does not change meaningfully between requests.
_EXPLANATION_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}
_EXPLANATION_TTL_SECONDS = 600


async def explain_risk(
    *,
    risk_score: float,
    risk_level: str,
    contributions: List[Dict[str, Any]],
    evidence: Dict[str, Any],
    event_type: str,
    location_label: str,
) -> Dict[str, Any]:
    """Produce the explainability narrative + intervention recommendation."""
    # Bucket the score so small fluctuations do not miss the cache.
    cache_key = f"{location_label}|{risk_level}|{event_type}|{int(risk_score // 5)}"
    cached = _EXPLANATION_CACHE.get(cache_key)
    if cached and time.time() - cached[0] < _EXPLANATION_TTL_SECONDS:
        return cached[1]

    result = await _explain_risk_uncached(
        risk_score=risk_score,
        risk_level=risk_level,
        contributions=contributions,
        evidence=evidence,
        event_type=event_type,
        location_label=location_label,
    )
    _EXPLANATION_CACHE[cache_key] = (time.time(), result)

    # Unbounded growth is a slow leak across 36 regions; trim oldest entries.
    if len(_EXPLANATION_CACHE) > 256:
        for key, _ in sorted(_EXPLANATION_CACHE.items(), key=lambda kv: kv[1][0])[:64]:
            _EXPLANATION_CACHE.pop(key, None)

    return result


async def _explain_risk_uncached(
    *,
    risk_score: float,
    risk_level: str,
    contributions: List[Dict[str, Any]],
    evidence: Dict[str, Any],
    event_type: str,
    location_label: str,
) -> Dict[str, Any]:
    if settings.gemini_enabled:
        try:
            raw = await _call_gemini_explain(
                risk_score=risk_score,
                risk_level=risk_level,
                contributions=contributions,
                evidence=evidence,
                event_type=event_type,
                location_label=location_label,
            )
            return {
                "summary": _clean_text(raw.get("summary"), 900) or _fallback_summary(
                    risk_level, contributions
                ),
                "recommended_action": _clean_text(raw.get("recommended_action"), 400)
                or _fallback_action(event_type),
                "forecast_note": _clean_text(raw.get("forecast_note"), 300)
                or "Near-term direction depends on dispersion conditions.",
                "likely_source": _clean_text(raw.get("likely_source"), 160)
                or _default_source(event_type),
                "ai_provider": "GEMINI",
                "model_name": settings.gemini_model,
            }
        except Exception as exc:  # noqa: BLE001
            logger.warning("Gemini explanation failed, using fallback: %s", exc)

    return {
        "summary": _fallback_summary(risk_level, contributions),
        "recommended_action": _fallback_action(event_type),
        "forecast_note": _fallback_forecast_note(evidence),
        "likely_source": _default_source(event_type),
        "ai_provider": "DEMO_MODE",
        "model_name": "aeroshield-rule-explainer-v1",
    }


# --------------------------------------------------------------------------
# Gemini transport
# --------------------------------------------------------------------------
async def _post(payload: Dict[str, Any]) -> Dict[str, Any]:
    url = f"{_API_ROOT}/{settings.gemini_model}:generateContent"
    async with httpx.AsyncClient(timeout=settings.gemini_timeout_seconds) as client:
        response = await client.post(
            url,
            params={"key": settings.google_gemini_api_key},
            json=payload,
            headers={"Content-Type": "application/json"},
        )
        if response.status_code >= 400:
            raise RuntimeError(f"Gemini API {response.status_code}: {response.text[:300]}")
        return response.json()


def _extract_json(body: Dict[str, Any]) -> Dict[str, Any]:
    candidates = body.get("candidates") or []
    if not candidates:
        raise RuntimeError("Gemini returned no candidates")
    parts = (candidates[0].get("content") or {}).get("parts") or []
    text = "".join(part.get("text", "") for part in parts).strip()
    if not text:
        raise RuntimeError("Gemini returned an empty response")
    # Tolerate a fenced block even though responseMimeType requests raw JSON.
    if text.startswith("```"):
        text = text.split("```")[1]
        text = text[4:] if text.lower().startswith("json") else text
    return json.loads(text)


async def _call_gemini_image(
    *,
    image_bytes: Optional[bytes],
    mime_type: str,
    latitude: float,
    longitude: float,
    description: str,
    report_type: str,
    context: Dict[str, Any],
) -> Dict[str, Any]:
    weather = context.get("weather") or {}
    air = context.get("air_quality") or {}
    satellite = context.get("satellite") or {}

    prompt_lines = [
        "Analyse this suspected pollution event and return the structured schema.",
        "",
        "## Citizen submission",
        f"- Reported category: {report_type}",
        f"- Citizen description: {description.strip() or '(none provided)'}",
        f"- Coordinates: {latitude:.4f}, {longitude:.4f}",
        f"- Location: {context.get('location_label') or 'unspecified'}",
        "",
        "## Independently measured / modelled context",
        "(Use this to sanity-check the visual reading. Do NOT restate these as "
        "if you derived them from the image.)",
        f"- Reference PM2.5: {air.get('pm25', 'n/a')} ug/m3 "
        f"({air.get('data_mode', 'UNKNOWN')} data)",
        f"- Reference PM10: {air.get('pm10', 'n/a')} ug/m3",
        f"- Wind: {weather.get('wind_speed_ms', 'n/a')} m/s from "
        f"{weather.get('wind_direction_compass', 'n/a')}",
        f"- Temperature: {weather.get('temperature', 'n/a')} C, "
        f"humidity {weather.get('humidity', 'n/a')}%",
        f"- Dispersion index (0=stagnant, 1=well ventilated): "
        f"{weather.get('dispersion_index', 'n/a')}",
        f"- Satellite aerosol optical depth: "
        f"{satellite.get('aerosol_optical_depth', 'n/a')} "
        f"({satellite.get('data_mode', 'UNKNOWN')})",
        f"- Nearby thermal anomalies (fire detections): "
        f"{satellite.get('thermal_anomaly_count', 'n/a')}",
        f"- Land context: {satellite.get('land_context', 'n/a')}",
    ]

    if context.get("citizen_sensor"):
        sensor = context["citizen_sensor"]
        prompt_lines += [
            "",
            "## Citizen-supplied low-cost sensor reading (unverified)",
            f"- PM2.5: {sensor.get('pm25', 'n/a')} ug/m3",
            f"- PM10: {sensor.get('pm10', 'n/a')} ug/m3",
        ]

    if not image_bytes:
        prompt_lines += [
            "",
            "## NOTE",
            "No photograph was attached. Base your classification on the text "
            "report and context only, set image_quality to 'poor', and lower "
            "confidence accordingly.",
        ]

    parts: List[Dict[str, Any]] = [{"text": "\n".join(prompt_lines)}]
    if image_bytes:
        parts.append(
            {
                "inline_data": {
                    "mime_type": mime_type,
                    "data": base64.b64encode(image_bytes).decode("ascii"),
                }
            }
        )

    payload = {
        "system_instruction": {"parts": [{"text": _IMAGE_SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "temperature": 0.2,
            "topP": 0.9,
            "maxOutputTokens": 2048,
            "responseMimeType": "application/json",
            "responseSchema": _IMAGE_SCHEMA,
        },
    }
    return _extract_json(await _post(payload))


async def _call_gemini_explain(
    *,
    risk_score: float,
    risk_level: str,
    contributions: List[Dict[str, Any]],
    evidence: Dict[str, Any],
    event_type: str,
    location_label: str,
) -> Dict[str, Any]:
    contribution_lines = "\n".join(
        f"- {c.get('label')}: {c.get('weight_pct')}% of the score — {c.get('detail')}"
        for c in contributions
    )
    prompt = f"""Write the explanation panel for this assessment.

## Assessment
- Location: {location_label or 'unspecified'}
- Fused risk score: {risk_score:.0f} / 100 ({risk_level})
- Classified event: {EVENT_LABELS.get(event_type, event_type)}

## Weighted contributors (from the deterministic risk engine)
{contribution_lines or '- No dominant contributor identified'}

## Evidence bundle
{json.dumps(evidence, default=str)[:2500]}

Explain the risk in 2-3 sentences, naming the strongest contributors and being
explicit about which inputs are measured versus visual versus modelled. Then
give one concrete intervention for the responding authority, and one sentence
on the expected near-term direction."""

    payload = {
        "system_instruction": {"parts": [{"text": _EXPLAIN_SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 1024,
            "responseMimeType": "application/json",
            "responseSchema": _EXPLAIN_SCHEMA,
        },
    }
    return _extract_json(await _post(payload))


# --------------------------------------------------------------------------
# Validation of model output — never trust the model's field values verbatim
# --------------------------------------------------------------------------
def _clean_text(value: Any, limit: int) -> str:
    if not isinstance(value, str):
        return ""
    return " ".join(value.split())[:limit].strip()


def _clean_list(value: Any, limit: int = 6, item_limit: int = 140) -> List[str]:
    if not isinstance(value, list):
        return []
    out: List[str] = []
    for item in value:
        text = _clean_text(item, item_limit)
        if text:
            out.append(text)
        if len(out) >= limit:
            break
    return out


def _normalise_image_result(raw: Dict[str, Any], report_type: str) -> Dict[str, Any]:
    event_type = str(raw.get("event_type", "")).strip().lower()
    if event_type not in EVENT_TYPES:
        event_type = _report_type_to_event(report_type)

    severity = str(raw.get("severity", "")).strip().lower()
    if severity not in SEVERITY_LEVELS:
        severity = "moderate"

    try:
        confidence = float(raw.get("confidence", 0.5))
    except (TypeError, ValueError):
        confidence = 0.5
    confidence = round(min(max(confidence, 0.05), 0.97), 2)

    return {
        "event_type": event_type,
        "event_label": EVENT_LABELS.get(event_type, "Environmental Event"),
        "visible_indicators": _clean_list(raw.get("visible_indicators"))
        or ["No distinct visual indicator isolated"],
        "severity": severity,
        "confidence": confidence,
        "possible_source": _clean_text(raw.get("possible_source"), 160)
        or _default_source(event_type),
        "environmental_concerns": _clean_list(raw.get("environmental_concerns"))
        or ["Localised particulate exposure for nearby residents"],
        "recommended_action": _clean_text(raw.get("recommended_action"), 400)
        or _fallback_action(event_type),
        "plume_opacity": _enum_or(raw.get("plume_opacity"),
                                  ["none", "light", "moderate", "dense"], "moderate"),
        "visibility_impact": _enum_or(raw.get("visibility_impact"),
                                      ["none", "slight", "reduced", "severe"], "slight"),
        "image_quality": _enum_or(raw.get("image_quality"), ["poor", "fair", "good"], "fair"),
        "measurement_caveat": _clean_text(raw.get("measurement_caveat"), 400)
        or "Visual analysis establishes the presence and apparent character of an "
           "emission, not its pollutant concentration. Instrument measurement is "
           "required to determine AQI.",
        "disclaimer": _DISCLAIMER,
    }


def _enum_or(value: Any, allowed: List[str], default: str) -> str:
    text = str(value).strip().lower() if value is not None else ""
    return text if text in allowed else default


# --------------------------------------------------------------------------
# Deterministic fallback analyser (DEMO_MODE)
# --------------------------------------------------------------------------
_KEYWORD_MAP = [
    (("factory", "industrial", "plant", "stack", "chimney", "refinery", "smelter"),
     "industrial_smoke"),
    (("stubble", "crop", "field", "harvest", "farm", "paddy", "agricultur"),
     "agricultural_burning"),
    (("construct", "demolition", "cement", "excavat", "building site", "rubble"),
     "construction_dust"),
    (("traffic", "vehicle", "exhaust", "truck", "highway", "congestion", "diesel"),
     "traffic_pollution"),
    (("garbage", "waste", "trash", "landfill", "refuse", "dump"), "waste_burning"),
    (("haze", "smog", "visibility", "fog", "grey sky", "gray sky"), "haze_smog"),
]

_REPORT_TYPE_MAP = {
    "smoke": "industrial_smoke",
    "dust": "construction_dust",
    "burning": "waste_burning",
    "industrial_emission": "industrial_smoke",
    "smog": "haze_smog",
    "other": "unknown",
}


def _report_type_to_event(report_type: str) -> str:
    return _REPORT_TYPE_MAP.get((report_type or "").lower(), "unknown")


def _default_source(event_type: str) -> str:
    return {
        "industrial_smoke": "Industrial facility or combustion stack",
        "agricultural_burning": "Open agricultural residue burning",
        "construction_dust": "Construction or demolition activity",
        "traffic_pollution": "Dense vehicular traffic corridor",
        "waste_burning": "Open waste burning site",
        "haze_smog": "Accumulated regional haze under stable conditions",
        "unknown": "Source not determinable from available evidence",
    }.get(event_type, "Source not determinable from available evidence")


def _fallback_action(event_type: str) -> str:
    return {
        "industrial_smoke": "Deploy a mobile monitoring unit and inspect emission "
                            "compliance at nearby industrial facilities.",
        "agricultural_burning": "Dispatch a field verification team and coordinate "
                                "with the district agriculture office on residue "
                                "management enforcement.",
        "construction_dust": "Inspect the site for dust-suppression compliance "
                             "(barriers, water sprinkling, covered material).",
        "traffic_pollution": "Review traffic flow at the corridor and consider "
                             "signal retiming or temporary diversion during peak hours.",
        "waste_burning": "Dispatch municipal enforcement to extinguish the burn and "
                         "identify the responsible waste handler.",
        "haze_smog": "Issue a localised public health advisory and increase "
                     "monitoring frequency until dispersion improves.",
        "unknown": "Deploy a mobile monitoring unit to verify conditions before "
                   "escalating.",
    }.get(event_type, "Deploy a mobile monitoring unit to verify local conditions.")


def _fallback_image_result(
    *,
    image_bytes: Optional[bytes],
    description: str,
    report_type: str,
    context: Dict[str, Any],
) -> Dict[str, Any]:
    """Deterministic classifier used when no Gemini key is configured.

    Combines keyword evidence from the citizen's text with the reported
    category and the measured environmental context. Deterministic on the image
    digest so a given demo image always yields the same assessment.
    """
    text = (description or "").lower()
    event_type = _report_type_to_event(report_type)
    for keywords, mapped in _KEYWORD_MAP:
        if any(keyword in text for keyword in keywords):
            event_type = mapped
            break

    air = context.get("air_quality") or {}
    weather = context.get("weather") or {}
    satellite = context.get("satellite") or {}
    pm25 = float(air.get("pm25") or 45.0)
    dispersion = float(weather.get("dispersion_index") or 0.5)

    digest = hashlib.sha256(image_bytes or description.encode("utf-8") or b"seed").digest()
    jitter = digest[0] / 255.0

    severity_score = (
        min(pm25 / 150.0, 1.0) * 0.5
        + (1.0 - dispersion) * 0.3
        + jitter * 0.2
    )
    if severity_score > 0.72:
        severity, opacity, visibility = "severe", "dense", "severe"
    elif severity_score > 0.52:
        severity, opacity, visibility = "high", "dense", "reduced"
    elif severity_score > 0.32:
        severity, opacity, visibility = "moderate", "moderate", "slight"
    else:
        severity, opacity, visibility = "low", "light", "none"

    confidence = round(min(0.88, 0.46 + (0.2 if image_bytes else 0.0)
                           + (0.12 if len(text) > 40 else 0.0) + jitter * 0.12), 2)

    indicators = _fallback_indicators(event_type, opacity)
    if satellite.get("thermal_anomaly_count"):
        indicators.append(
            f"{satellite['thermal_anomaly_count']} thermal anomaly detection(s) "
            "reported nearby in the same period"
        )

    return {
        "event_type": event_type,
        "event_label": EVENT_LABELS.get(event_type, "Environmental Event"),
        "visible_indicators": indicators[:6],
        "severity": severity,
        "confidence": confidence,
        "possible_source": _default_source(event_type),
        "environmental_concerns": _fallback_concerns(event_type),
        "recommended_action": _fallback_action(event_type),
        "plume_opacity": opacity,
        "visibility_impact": visibility,
        "image_quality": "fair" if image_bytes else "poor",
        "measurement_caveat": (
            "This assessment is derived from visual and contextual evidence only. "
            "It establishes the apparent character of the event, not a pollutant "
            "concentration; certified instrument measurement is required to "
            "determine AQI."
        ),
        "disclaimer": _DISCLAIMER,
        "ai_provider": "DEMO_MODE",
        "model_name": "aeroshield-heuristic-vision-v1",
    }


def _fallback_indicators(event_type: str, opacity: str) -> List[str]:
    shared = {
        "industrial_smoke": [
            f"{opacity.capitalize()} grey-white plume consistent with a point-source stack",
            "Plume rises vertically before shearing horizontally with the wind",
            "Discolouration of the sky immediately downwind of the source",
        ],
        "agricultural_burning": [
            f"{opacity.capitalize()} low-level smoke spreading laterally across open land",
            "Ground-level combustion with a broad, diffuse smoke front",
            "Smoke layer trapped close to the surface",
        ],
        "construction_dust": [
            f"{opacity.capitalize()} light-brown particulate cloud near ground level",
            "Exposed earth or aggregate material without visible containment",
            "Dust re-suspension along the site access route",
        ],
        "traffic_pollution": [
            "Brown-tinted haze concentrated along a roadway corridor",
            "Reduced visibility of the far end of the road",
            "Dense queued vehicles consistent with congestion-related emissions",
        ],
        "waste_burning": [
            f"{opacity.capitalize()} dark smoke with irregular colour, typical of mixed waste",
            "Visible refuse pile at the combustion point",
            "Low plume height indicating uncontrolled open burning",
        ],
        "haze_smog": [
            "Uniform grey haze layer reducing horizon contrast",
            "No single identifiable point source visible",
            "Flat, layered appearance consistent with a stable boundary layer",
        ],
        "unknown": [
            "Atmospheric discolouration present but not attributable to a clear source",
            "Insufficient visual context to isolate an emission origin",
        ],
    }
    return list(shared.get(event_type, shared["unknown"]))


def _fallback_concerns(event_type: str) -> List[str]:
    base = ["Short-term particulate exposure for residents within the immediate area"]
    extra = {
        "industrial_smoke": [
            "Possible co-emission of sulphur and nitrogen oxides",
            "Cumulative exposure risk for adjacent residential blocks",
        ],
        "agricultural_burning": [
            "Regional PM2.5 loading during the burning season",
            "Reduced visibility affecting nearby road corridors",
        ],
        "construction_dust": [
            "Coarse particulate (PM10) deposition on surrounding streets",
            "Respiratory irritation risk for on-site workers",
        ],
        "traffic_pollution": [
            "Elevated NO2 exposure along the corridor",
            "Higher exposure for pedestrians and roadside vendors",
        ],
        "waste_burning": [
            "Potential release of dioxins and other toxic combustion by-products",
            "Acute exposure risk for informal settlements nearby",
        ],
        "haze_smog": [
            "Region-wide exposure rather than a single localised source",
            "Elevated risk for children, elderly, and respiratory patients",
        ],
        "unknown": ["Unverified event requiring ground confirmation"],
    }
    return base + extra.get(event_type, [])


def _fallback_summary(risk_level: str, contributions: List[Dict[str, Any]]) -> str:
    top = sorted(contributions, key=lambda c: c.get("weight_pct", 0), reverse=True)[:3]
    if not top:
        return (
            f"Fused evidence places this location in the {risk_level} risk band, but no "
            "single input dominates the assessment."
        )
    named = ", ".join(str(c.get("label", "")).lower() for c in top if c.get("label"))
    return (
        f"Multiple independent signals place this location in the {risk_level} risk band. "
        f"The strongest contributors are {named}. Measured particulate values and "
        "meteorological dispersion conditions carry the most weight; visual and citizen "
        "evidence corroborate rather than drive the score."
    )


def _fallback_forecast_note(evidence: Dict[str, Any]) -> str:
    weather = evidence.get("weather") or {}
    dispersion = float(weather.get("dispersion_index") or 0.5)
    if dispersion < 0.3:
        return "Risk is likely to increase over the next 6 hours while dispersion remains poor."
    if dispersion > 0.65:
        return "Risk is likely to ease over the next 6 hours as ventilation improves."
    return "Risk is expected to hold near its current level over the next 6 hours."
