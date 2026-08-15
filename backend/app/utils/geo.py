"""Geospatial helpers. Pure functions, no external service required."""

from __future__ import annotations

import math
from typing import Iterable, Optional, Tuple

EARTH_RADIUS_KM = 6371.0088


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in kilometres."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    d_phi = p2 - p1
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(d_lambda / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def validate_coordinates(latitude: float, longitude: float) -> Tuple[float, float]:
    """Server-side coordinate validation — client values are never trusted."""
    try:
        lat = float(latitude)
        lon = float(longitude)
    except (TypeError, ValueError) as exc:
        raise ValueError("Coordinates must be numeric") from exc
    if not math.isfinite(lat) or not math.isfinite(lon):
        raise ValueError("Coordinates must be finite numbers")
    if not -90.0 <= lat <= 90.0:
        raise ValueError("Latitude must be between -90 and 90")
    if not -180.0 <= lon <= 180.0:
        raise ValueError("Longitude must be between -180 and 180")
    return round(lat, 6), round(lon, 6)


def bearing_to_compass(degrees: Optional[float]) -> str:
    if degrees is None:
        return "—"
    points = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
              "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    return points[int((degrees % 360) / 22.5 + 0.5) % 16]


def centroid(points: Iterable[Tuple[float, float]]) -> Optional[Tuple[float, float]]:
    pts = list(points)
    if not pts:
        return None
    return (
        sum(p[0] for p in pts) / len(pts),
        sum(p[1] for p in pts) / len(pts),
    )


def downwind_offset(lat: float, lon: float, wind_from_deg: float, distance_km: float) -> Tuple[float, float]:
    """Project a point downwind. `wind_from_deg` is the meteorological convention
    (direction the wind blows *from*), so the plume travels toward +180deg."""
    toward = math.radians((wind_from_deg + 180.0) % 360.0)
    d_lat = (distance_km / 111.32) * math.cos(toward)
    d_lon = (distance_km / (111.32 * max(math.cos(math.radians(lat)), 0.01))) * math.sin(toward)
    return round(lat + d_lat, 6), round(lon + d_lon, 6)
