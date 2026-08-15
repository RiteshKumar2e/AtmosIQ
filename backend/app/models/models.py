"""SQLAlchemy ORM models.

Design note (cross-border): every geographic entity carries an ISO 3166
`country_code` plus an ISO 3166-2 `region_code`. No country-specific logic
exists anywhere in the schema, so the same deployment artefact can be run
independently by any BRICS member state.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False, index=True
    )


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="citizen", nullable=False)
    organisation: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    country_code: Mapped[str] = mapped_column(String(2), default="IN", nullable=False)
    region_code: Mapped[str] = mapped_column(String(8), default="IN-DL", nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    reports: Mapped[List["CitizenReport"]] = relationship(back_populates="user")


class Region(Base):
    """Deployment region metadata — the unit of interoperability."""

    __tablename__ = "regions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    region_code: Mapped[str] = mapped_column(String(8), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), index=True, nullable=False)
    country_name: Mapped[str] = mapped_column(String(80), nullable=False)
    flag: Mapped[str] = mapped_column(String(8), default="", nullable=False)
    center_lat: Mapped[float] = mapped_column(Float, nullable=False)
    center_lon: Mapped[float] = mapped_column(Float, nullable=False)
    population_millions: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    timezone_name: Mapped[str] = mapped_column(String(64), default="UTC", nullable=False)
    node_status: Mapped[str] = mapped_column(String(24), default="PLANNED", nullable=False)
    data_mode: Mapped[str] = mapped_column(String(16), default="SIMULATED", nullable=False)


class MonitoringStation(Base):
    """Reference/regulatory grade fixed station (sparse by design)."""

    __tablename__ = "monitoring_stations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    station_code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), index=True, nullable=False)
    region_code: Mapped[str] = mapped_column(String(8), index=True, nullable=False)
    operator: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    coverage_radius_km: Mapped[float] = mapped_column(Float, default=5.0, nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="ONLINE", nullable=False)
    data_mode: Mapped[str] = mapped_column(String(16), default="SIMULATED", nullable=False)


class CitizenReport(Base, TimestampMixin):
    __tablename__ = "citizen_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), index=True, nullable=False, default="IN")
    region_code: Mapped[str] = mapped_column(String(8), index=True, nullable=False, default="IN-DL")
    location_label: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    report_type: Mapped[str] = mapped_column(String(48), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Optional citizen/low-cost sensor payload
    pm25: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pm10: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    temperature: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    humidity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    status: Mapped[str] = mapped_column(String(24), default="PENDING", nullable=False, index=True)
    data_mode: Mapped[str] = mapped_column(String(16), default="LIVE", nullable=False)
    is_demo_seed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped[Optional[User]] = relationship(back_populates="reports")
    assessment: Mapped[Optional["AIAssessment"]] = relationship(
        back_populates="report", uselist=False, cascade="all, delete-orphan"
    )


class AIAssessment(Base, TimestampMixin):
    __tablename__ = "ai_assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    report_id: Mapped[int] = mapped_column(
        ForeignKey("citizen_reports.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    severity: Mapped[str] = mapped_column(String(24), nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(16), nullable=False)
    hotspot_probability: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    likely_source: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    ai_summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    recommended_action: Mapped[str] = mapped_column(Text, default="", nullable=False)
    visible_indicators: Mapped[str] = mapped_column(Text, default="[]", nullable=False)  # JSON
    environmental_concerns: Mapped[str] = mapped_column(Text, default="[]", nullable=False)  # JSON
    contributions: Mapped[str] = mapped_column(Text, default="[]", nullable=False)  # JSON
    evidence: Mapped[str] = mapped_column(Text, default="{}", nullable=False)  # JSON
    forecast_note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    ai_provider: Mapped[str] = mapped_column(String(24), default="DEMO_MODE", nullable=False)
    model_name: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    analysis_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    report: Mapped[CitizenReport] = relationship(back_populates="assessment")


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    station_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("monitoring_stations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), index=True, nullable=False, default="IN")
    region_code: Mapped[str] = mapped_column(String(8), index=True, nullable=False, default="IN-DL")
    pm25: Mapped[float] = mapped_column(Float, nullable=False)
    pm10: Mapped[float] = mapped_column(Float, nullable=False)
    no2: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    so2: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    temperature: Mapped[float] = mapped_column(Float, nullable=False)
    humidity: Mapped[float] = mapped_column(Float, nullable=False)
    wind_speed_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    wind_direction_deg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    source: Mapped[str] = mapped_column(String(32), default="STATION", nullable=False)
    data_mode: Mapped[str] = mapped_column(String(16), default="SIMULATED", nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False, index=True
    )


class Hotspot(Base):
    __tablename__ = "hotspots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), index=True, nullable=False, default="IN")
    region_code: Mapped[str] = mapped_column(String(8), index=True, nullable=False, default="IN-DL")
    location_label: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    hotspot_probability: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    pollution_type: Mapped[str] = mapped_column(String(64), default="unknown", nullable=False)
    likely_source: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    source: Mapped[str] = mapped_column(String(48), default="FUSED", nullable=False)
    radius_km: Mapped[float] = mapped_column(Float, default=2.0, nullable=False)
    population_exposed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    signal_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    forecast_note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    forecast_trend: Mapped[str] = mapped_column(String(16), default="STABLE", nullable=False)
    contributions: Mapped[str] = mapped_column(Text, default="[]", nullable=False)  # JSON
    ai_summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    recommended_action: Mapped[str] = mapped_column(Text, default="", nullable=False)
    report_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("citizen_reports.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(24), default="ACTIVE", nullable=False, index=True)
    data_mode: Mapped[str] = mapped_column(String(16), default="MODELLED", nullable=False)
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False, index=True
    )

    alerts: Mapped[List["Alert"]] = relationship(back_populates="hotspot")


class Alert(Base, TimestampMixin):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    hotspot_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("hotspots.id", ondelete="SET NULL"), nullable=True, index=True
    )
    severity: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    location_label: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), index=True, nullable=False, default="IN")
    region_code: Mapped[str] = mapped_column(String(8), index=True, nullable=False, default="IN-DL")
    risk_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    forecast_trend: Mapped[str] = mapped_column(String(16), default="STABLE", nullable=False)
    recommended_action: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="NEW", nullable=False, index=True)
    assigned_to: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    data_mode: Mapped[str] = mapped_column(String(16), default="MODELLED", nullable=False)

    hotspot: Mapped[Optional[Hotspot]] = relationship(back_populates="alerts")


class PollutionRecord(Base):
    """Daily aggregated history used by trend analytics and the forecast prior."""

    __tablename__ = "pollution_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    country_code: Mapped[str] = mapped_column(String(2), index=True, nullable=False, default="IN")
    region_code: Mapped[str] = mapped_column(String(8), index=True, nullable=False, default="IN-DL")
    recorded_on: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    avg_pm25: Mapped[float] = mapped_column(Float, nullable=False)
    avg_pm10: Mapped[float] = mapped_column(Float, nullable=False)
    avg_risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    hotspot_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    report_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    dominant_source: Mapped[str] = mapped_column(String(48), default="traffic", nullable=False)
    data_mode: Mapped[str] = mapped_column(String(16), default="SIMULATED", nullable=False)


class ContactMessage(Base, TimestampMixin):
    """Enquiry submitted through the public contact page."""

    __tablename__ = "contact_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    organization: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    handled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
