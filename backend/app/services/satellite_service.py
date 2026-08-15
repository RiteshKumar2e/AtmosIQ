"""Satellite-derived environmental features.

The prototype ships a deterministic model of the features that a real
deployment would read from Sentinel-5P / MODIS via Google Earth Engine:

  * aerosol_optical_depth  — column aerosol loading (MODIS MAIAC analogue)
  * thermal_anomaly_count  — active fire / open-burning detections (VIIRS)
  * no2_column             — tropospheric NO2 (Sentinel-5P TROPOMI)
  * built_up_fraction      — land-cover context for source attribution

Integration is intentionally isolated behind `get_features()`. Supplying
`GOOGLE_EARTH_ENGINE_PROJECT` and swapping the body of `_fetch_earth_engine()`
is the entire change needed to go live — nothing else in the platform depends
on the provider.
"""

from __future__ import annotations

import math
import time
from typing import Any, Dict, Optional

from app.config import settings


def _hash01(*values: float) -> float:
    seed = sum(v * m for v, m in zip(values, (12.9898, 78.233, 37.719, 4.581))) * 43758.5453
    return seed - math.floor(seed)


async def _fetch_earth_engine(latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
    """Placeholder for the Google Earth Engine path.

    Returns None unless a project is configured, which keeps the platform fully
    functional without cloud credentials. A real implementation authenticates
    with a service account and reduces an ImageCollection over a buffer around
    the point; the return shape is identical to the modelled path below.
    """
    if not settings.google_earth_engine_project:
        return None
    return None


def _model(latitude: float, longitude: float, hour: Optional[int] = None) -> Dict[str, Any]:
    if hour is None:
        hour = time.gmtime().tm_hour
    phase = _hash01(latitude, longitude)
    seasonal = 0.5 + 0.5 * math.sin(time.gmtime().tm_yday / 365.0 * 2 * math.pi)

    aod = round(0.18 + 0.62 * phase * (0.6 + 0.5 * seasonal), 3)
    thermal = int(round(max(0.0, (phase - 0.55) * 24.0)))
    no2_column = round(38.0 + 120.0 * phase * (0.7 + 0.4 * math.exp(-((hour - 9) ** 2) / 18.0)), 1)
    built_up = round(min(0.97, 0.22 + 0.72 * _hash01(longitude, latitude)), 2)

    return {
        "aerosol_optical_depth": aod,
        "aod_interpretation": _aod_label(aod),
        "thermal_anomaly_count": thermal,
        "no2_column_umol_m2": no2_column,
        "built_up_fraction": built_up,
        "land_context": _land_label(built_up),
        "observation_age_hours": round(1.0 + 5.0 * phase, 1),
        "data_mode": "SIMULATED",
        "provider": "modelled-satellite-features",
    }


def _aod_label(aod: float) -> str:
    if aod < 0.25:
        return "Clear column — low aerosol loading"
    if aod < 0.45:
        return "Moderate aerosol loading"
    if aod < 0.7:
        return "Elevated aerosol loading consistent with regional haze"
    return "High aerosol loading — dense particulate column"


def _land_label(built_up: float) -> str:
    if built_up > 0.75:
        return "Dense urban / industrial land cover"
    if built_up > 0.45:
        return "Mixed urban and peri-urban land cover"
    if built_up > 0.2:
        return "Peri-urban with agricultural margins"
    return "Predominantly agricultural / open land"


async def get_features(latitude: float, longitude: float) -> Dict[str, Any]:
    live = await _fetch_earth_engine(latitude, longitude)
    if live:
        live["data_mode"] = "LIVE"
        return live
    return _model(latitude, longitude)


def get_features_sync(latitude: float, longitude: float, hour: Optional[int] = None) -> Dict[str, Any]:
    return _model(latitude, longitude, hour)
