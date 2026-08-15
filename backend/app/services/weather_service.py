"""Meteorological context provider.

Primary source is Open-Meteo, which is keyless and works in every BRICS
geography, so the prototype reports genuinely LIVE meteorology out of the box.
If the network or the provider is unavailable, a deterministic physical
simulation takes over and the payload is relabelled `SIMULATED` — the UI shows
that provenance badge rather than silently presenting synthetic data as real.
"""

from __future__ import annotations

import math
import time
from typing import Any, Dict, Optional, Tuple

import httpx

from app.utils.geo import bearing_to_compass

_OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
_CACHE_TTL_SECONDS = 600
_cache: Dict[Tuple[float, float], Tuple[float, Dict[str, Any]]] = {}


def _dispersion_index(wind_speed: float, temperature: float, humidity: float) -> float:
    """0-1 estimate of how readily the atmosphere disperses local emissions.

    Wind speed dominates; high humidity and low temperature act as a proxy for
    a shallow, stable boundary layer (the classic winter inversion that traps
    particulates near the surface).
    """
    ventilation = min(wind_speed / 6.0, 1.0)
    stability_penalty = 0.0
    if humidity > 70:
        stability_penalty += (humidity - 70) / 100.0
    if temperature < 15:
        stability_penalty += (15 - temperature) / 60.0
    return round(max(0.05, min(1.0, ventilation - stability_penalty * 0.6)), 3)


def _describe(wind_speed: float, dispersion: float) -> str:
    if dispersion < 0.25:
        return "Stagnant air — poor dispersion, emissions likely to accumulate locally"
    if dispersion < 0.5:
        return "Limited dispersion — pollutants may linger near the source"
    if wind_speed > 7:
        return "Strong ventilation — rapid dilution but wider downwind transport"
    return "Moderate dispersion — normal pollutant transport conditions"


def _simulate(latitude: float, longitude: float, hour: Optional[int] = None) -> Dict[str, Any]:
    """Deterministic meteorology derived from position and time of day.

    Deterministic (not random) so that repeated demo runs are reproducible and
    the map, forecast, and risk engine always agree with each other.
    """
    if hour is None:
        hour = time.gmtime().tm_hour
    seed = abs(math.sin(latitude * 12.9898 + longitude * 78.233)) * 43758.5453
    phase = seed - math.floor(seed)

    diurnal = math.sin((hour - 6) / 24.0 * 2 * math.pi)
    wind_speed = round(max(0.4, 2.6 + 2.0 * phase + 1.6 * diurnal), 1)
    direction = round((phase * 360.0 + hour * 4.0) % 360.0, 1)
    temperature = round(18.0 + 9.0 * diurnal + 6.0 * (phase - 0.5) - abs(latitude) * 0.12, 1)
    humidity = round(min(96.0, max(18.0, 64.0 - 18.0 * diurnal + 20.0 * (phase - 0.5))), 1)

    return {
        "temperature": temperature,
        "humidity": humidity,
        "wind_speed_ms": wind_speed,
        "wind_direction_deg": direction,
        "wind_gust_ms": round(wind_speed * 1.45, 1),
        "precipitation_mm": 0.0,
        "data_mode": "SIMULATED",
        "provider": "deterministic-model",
    }


async def _fetch_live(latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
    params = {
        "latitude": round(latitude, 3),
        "longitude": round(longitude, 3),
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,"
                   "wind_direction_10m,wind_gusts_10m,precipitation",
        "wind_speed_unit": "ms",
        "timezone": "UTC",
    }
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            response = await client.get(_OPEN_METEO_URL, params=params)
            response.raise_for_status()
            current = response.json().get("current") or {}
    except (httpx.HTTPError, ValueError, KeyError):
        return None

    if "temperature_2m" not in current:
        return None

    return {
        "temperature": float(current.get("temperature_2m", 20.0)),
        "humidity": float(current.get("relative_humidity_2m", 55.0)),
        "wind_speed_ms": float(current.get("wind_speed_10m", 2.5)),
        "wind_direction_deg": float(current.get("wind_direction_10m", 180.0)),
        "wind_gust_ms": float(current.get("wind_gusts_10m", 4.0)),
        "precipitation_mm": float(current.get("precipitation", 0.0)),
        "data_mode": "LIVE",
        "provider": "open-meteo",
    }


async def get_weather(latitude: float, longitude: float) -> Dict[str, Any]:
    """Return current meteorology, cached per ~1km grid cell for 10 minutes."""
    key = (round(latitude, 2), round(longitude, 2))
    now = time.time()
    cached = _cache.get(key)
    if cached and now - cached[0] < _CACHE_TTL_SECONDS:
        return cached[1]

    payload = await _fetch_live(latitude, longitude) or _simulate(latitude, longitude)
    payload["dispersion_index"] = _dispersion_index(
        payload["wind_speed_ms"], payload["temperature"], payload["humidity"]
    )
    payload["wind_direction_compass"] = bearing_to_compass(payload["wind_direction_deg"])
    payload["description"] = _describe(payload["wind_speed_ms"], payload["dispersion_index"])
    _cache[key] = (now, payload)
    return payload


def get_weather_sync(latitude: float, longitude: float) -> Dict[str, Any]:
    """Cache-only accessor for synchronous call sites (seeding, analytics)."""
    key = (round(latitude, 2), round(longitude, 2))
    cached = _cache.get(key)
    if cached and time.time() - cached[0] < _CACHE_TTL_SECONDS:
        return cached[1]
    payload = _simulate(latitude, longitude)
    payload["dispersion_index"] = _dispersion_index(
        payload["wind_speed_ms"], payload["temperature"], payload["humidity"]
    )
    payload["wind_direction_compass"] = bearing_to_compass(payload["wind_direction_deg"])
    payload["description"] = _describe(payload["wind_speed_ms"], payload["dispersion_index"])
    return payload
