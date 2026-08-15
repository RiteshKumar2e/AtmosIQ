"""Ambient air-quality provider and AQI utilities.

Live particulate data comes from the Open-Meteo air-quality endpoint (keyless,
global coverage). A deterministic model backs it up so the platform never
degrades to an empty dashboard, and provenance is always labelled.
"""

from __future__ import annotations

import math
import time
from typing import Any, Dict, Optional, Tuple

import httpx

_AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
_CACHE_TTL_SECONDS = 900
_cache: Dict[Tuple[float, float], Tuple[float, Dict[str, Any]]] = {}

# WHO 2021 24-hour guideline values (ug/m3) — used for the exceedance factor.
WHO_PM25_GUIDELINE = 15.0
WHO_PM10_GUIDELINE = 45.0

# Indian CPCB / widely used AQI breakpoints for PM2.5 (ug/m3).
_PM25_BREAKPOINTS = [
    (0.0, 30.0, 0, 50, "Good"),
    (30.0, 60.0, 51, 100, "Satisfactory"),
    (60.0, 90.0, 101, 200, "Moderate"),
    (90.0, 120.0, 201, 300, "Poor"),
    (120.0, 250.0, 301, 400, "Very Poor"),
    (250.0, 1000.0, 401, 500, "Severe"),
]


def pm25_to_aqi(pm25: float) -> Tuple[int, str]:
    """Convert a PM2.5 concentration to an AQI index and category."""
    pm25 = max(0.0, float(pm25))
    for low_c, high_c, low_i, high_i, label in _PM25_BREAKPOINTS:
        if low_c <= pm25 <= high_c:
            aqi = low_i + (high_i - low_i) * (pm25 - low_c) / (high_c - low_c)
            return int(round(aqi)), label
    return 500, "Severe"


def exceedance_factor(pm25: float) -> float:
    """How many times the WHO 24-hour guideline the reading represents."""
    return round(max(0.0, pm25) / WHO_PM25_GUIDELINE, 1)


def _simulate(latitude: float, longitude: float, hour: Optional[int] = None) -> Dict[str, Any]:
    if hour is None:
        hour = time.gmtime().tm_hour
    seed = abs(math.cos(latitude * 4.898 + longitude * 7.23)) * 20997.5
    phase = seed - math.floor(seed)

    # Twin morning/evening traffic peaks plus an overnight accumulation term.
    morning = math.exp(-((hour - 8) ** 2) / 8.0)
    evening = math.exp(-((hour - 20) ** 2) / 10.0)
    overnight = math.exp(-((hour - 2) ** 2) / 20.0)
    base = 34.0 + 46.0 * phase
    pm25 = base * (0.72 + 0.5 * morning + 0.62 * evening + 0.35 * overnight)
    pm25 = round(max(6.0, min(420.0, pm25)), 1)
    pm10 = round(pm25 * (1.7 + 0.35 * phase), 1)

    aqi, category = pm25_to_aqi(pm25)
    return {
        "pm25": pm25,
        "pm10": pm10,
        "no2": round(12.0 + 40.0 * phase * (0.6 + morning), 1),
        "so2": round(4.0 + 16.0 * phase, 1),
        "aqi": aqi,
        "aqi_category": category,
        "who_exceedance": exceedance_factor(pm25),
        "data_mode": "SIMULATED",
        "provider": "deterministic-model",
    }


async def _fetch_live(latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
    params = {
        "latitude": round(latitude, 3),
        "longitude": round(longitude, 3),
        "current": "pm10,pm2_5,nitrogen_dioxide,sulphur_dioxide",
        "timezone": "UTC",
    }
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            response = await client.get(_AIR_QUALITY_URL, params=params)
            response.raise_for_status()
            current = response.json().get("current") or {}
    except (httpx.HTTPError, ValueError, KeyError):
        return None

    pm25 = current.get("pm2_5")
    if pm25 is None:
        return None

    pm25 = float(pm25)
    aqi, category = pm25_to_aqi(pm25)
    return {
        "pm25": round(pm25, 1),
        "pm10": round(float(current.get("pm10") or pm25 * 1.8), 1),
        "no2": round(float(current.get("nitrogen_dioxide") or 0.0), 1),
        "so2": round(float(current.get("sulphur_dioxide") or 0.0), 1),
        "aqi": aqi,
        "aqi_category": category,
        "who_exceedance": exceedance_factor(pm25),
        "data_mode": "LIVE",
        "provider": "open-meteo-air-quality",
    }


async def get_air_quality(latitude: float, longitude: float) -> Dict[str, Any]:
    key = (round(latitude, 2), round(longitude, 2))
    now = time.time()
    cached = _cache.get(key)
    if cached and now - cached[0] < _CACHE_TTL_SECONDS:
        return cached[1]

    payload = await _fetch_live(latitude, longitude) or _simulate(latitude, longitude)
    _cache[key] = (now, payload)
    return payload


def get_air_quality_sync(latitude: float, longitude: float, hour: Optional[int] = None) -> Dict[str, Any]:
    key = (round(latitude, 2), round(longitude, 2))
    cached = _cache.get(key)
    if cached and hour is None and time.time() - cached[0] < _CACHE_TTL_SECONDS:
        return cached[1]
    return _simulate(latitude, longitude, hour)
