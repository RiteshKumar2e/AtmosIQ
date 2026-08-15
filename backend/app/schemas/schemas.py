"""Pydantic v2 request/response schemas.

These double as the interoperability contract: the shapes below are what a
BRICS partner node exchanges, so they are deliberately country-agnostic and
carry explicit `data_mode` provenance on everything.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

RiskLevel = Literal["LOW", "MODERATE", "HIGH", "CRITICAL"]
DataMode = Literal["LIVE", "SIMULATED", "MODELLED"]
Role = Literal["citizen", "analyst", "authority", "admin"]

REPORT_TYPES = [
    "smoke",
    "dust",
    "burning",
    "industrial_emission",
    "smog",
    "other",
]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --------------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------------
class UserRegister(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Role = "citizen"
    organisation: Optional[str] = Field(default=None, max_length=160)
    country_code: str = Field(default="IN", min_length=2, max_length=2)
    region_code: str = Field(default="IN-DL", max_length=8)

    @field_validator("country_code")
    @classmethod
    def _upper(cls, v: str) -> str:
        return v.upper()


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserOut(ORMModel):
    id: int
    name: str
    email: EmailStr
    role: Role
    organisation: Optional[str] = None
    country_code: str
    region_code: str
    is_demo: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


class DemoLoginRequest(BaseModel):
    role: Literal["authority", "analyst", "citizen"]


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


# --------------------------------------------------------------------------
# Reports
# --------------------------------------------------------------------------
class SensorPayload(BaseModel):
    pm25: Optional[float] = Field(default=None, ge=0, le=1500)
    pm10: Optional[float] = Field(default=None, ge=0, le=2000)
    temperature: Optional[float] = Field(default=None, ge=-60, le=65)
    humidity: Optional[float] = Field(default=None, ge=0, le=100)


class ReportCreate(SensorPayload):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    report_type: str
    description: str = Field(default="", max_length=2000)
    location_label: str = Field(default="", max_length=160)
    country_code: str = Field(default="IN", min_length=2, max_length=2)
    region_code: str = Field(default="IN-DL", max_length=8)

    @field_validator("report_type")
    @classmethod
    def _known_type(cls, v: str) -> str:
        v = v.strip().lower().replace(" ", "_")
        if v not in REPORT_TYPES:
            raise ValueError(f"report_type must be one of: {', '.join(REPORT_TYPES)}")
        return v


class Contribution(BaseModel):
    factor: str
    label: str
    weight_pct: float
    detail: str
    direction: Literal["increase", "decrease", "neutral"] = "increase"


class AssessmentOut(ORMModel):
    id: int
    report_id: int
    event_type: str
    severity: str
    risk_score: float
    risk_level: RiskLevel
    hotspot_probability: float
    confidence: float
    likely_source: str
    ai_summary: str
    recommended_action: str
    visible_indicators: List[str] = []
    environmental_concerns: List[str] = []
    contributions: List[Contribution] = []
    evidence: Dict[str, Any] = {}
    forecast_note: str
    ai_provider: str
    model_name: str
    analysis_ms: int
    created_at: datetime


class ReportOut(ORMModel):
    id: int
    user_id: Optional[int]
    reporter_name: Optional[str] = None
    latitude: float
    longitude: float
    country_code: str
    region_code: str
    location_label: str
    report_type: str
    description: str
    image_url: Optional[str]
    pm25: Optional[float]
    pm10: Optional[float]
    temperature: Optional[float]
    humidity: Optional[float]
    status: str
    data_mode: DataMode
    is_demo_seed: bool
    created_at: datetime
    assessment: Optional[AssessmentOut] = None


class ReportListOut(BaseModel):
    items: List[ReportOut]
    total: int
    page: int
    page_size: int
    pages: int


class AnalyzeResponse(BaseModel):
    report: ReportOut
    assessment: Optional[AssessmentOut] = None
    hotspot: Optional["HotspotOut"] = None
    alert: Optional["AlertOut"] = None
    ai_provider: str
    pipeline: List[str]


# --------------------------------------------------------------------------
# Hotspots
# --------------------------------------------------------------------------
class HotspotOut(ORMModel):
    id: int
    latitude: float
    longitude: float
    country_code: str
    region_code: str
    location_label: str
    risk_score: float
    risk_level: RiskLevel
    hotspot_probability: float
    confidence: float
    pollution_type: str
    likely_source: str
    source: str
    radius_km: float
    population_exposed: int
    signal_count: int
    forecast_note: str
    forecast_trend: str
    contributions: List[Contribution] = []
    ai_summary: str
    recommended_action: str
    report_id: Optional[int]
    status: str
    data_mode: DataMode
    detected_at: datetime


class MonitoringStationOut(ORMModel):
    id: int
    station_code: str
    name: str
    latitude: float
    longitude: float
    country_code: str
    region_code: str
    operator: str
    coverage_radius_km: float
    status: str
    data_mode: DataMode
    latest_pm25: Optional[float] = None
    latest_pm10: Optional[float] = None


class MapLayersOut(BaseModel):
    hotspots: List[HotspotOut]
    reports: List[ReportOut]
    stations: List[MonitoringStationOut]
    wind: "WindOut"
    corridors: List[Dict[str, Any]]
    generated_at: datetime


class WindOut(BaseModel):
    speed_ms: float
    direction_deg: float
    direction_compass: str
    gust_ms: float
    dispersion_index: float
    description: str
    data_mode: DataMode


# --------------------------------------------------------------------------
# Alerts
# --------------------------------------------------------------------------
class AlertOut(ORMModel):
    id: int
    hotspot_id: Optional[int]
    severity: RiskLevel
    title: str
    description: str
    location_label: str
    country_code: str
    region_code: str
    risk_score: float
    forecast_trend: str
    recommended_action: str
    status: str
    assigned_to: Optional[str]
    acknowledged_at: Optional[datetime]
    resolved_at: Optional[datetime]
    data_mode: DataMode
    created_at: datetime


class AlertUpdate(BaseModel):
    status: Optional[Literal["NEW", "ACKNOWLEDGED", "ASSIGNED", "RESOLVED", "DISMISSED"]] = None
    assigned_to: Optional[str] = Field(default=None, max_length=120)


# --------------------------------------------------------------------------
# Forecast
# --------------------------------------------------------------------------
class ForecastPoint(BaseModel):
    timestamp: datetime
    hour_label: str
    risk_score: float
    lower_bound: float
    upper_bound: float
    pm25_estimate: float
    confidence: float


class ForecastOut(BaseModel):
    region_code: str
    country_code: str
    horizon_hours: int
    generated_at: datetime
    current_risk: float
    peak_risk: float
    peak_at: str
    trend: str
    points: List[ForecastPoint]
    contributing_factors: List[Contribution]
    model_name: str
    model_note: str
    data_mode: DataMode
    ai_summary: str = ""


# --------------------------------------------------------------------------
# Analytics
# --------------------------------------------------------------------------
class KpiOut(BaseModel):
    label: str
    value: float
    unit: str = ""
    delta_pct: Optional[float] = None
    level: Optional[str] = None
    data_mode: DataMode = "MODELLED"
    hint: str = ""


class OverviewOut(BaseModel):
    region_code: str
    country_code: str
    region_name: str
    generated_at: datetime
    kpis: List[KpiOut]
    current_risk: float
    current_risk_level: RiskLevel
    active_hotspots: int
    citizen_signals_24h: int
    critical_alerts: int
    wind: WindOut
    air_quality: Dict[str, Any]
    ai_provider: str
    top_hotspots: List[HotspotOut]
    recent_alerts: List[AlertOut]
    explainability: List[Contribution]
    reasoning_summary: str


class TrendPoint(BaseModel):
    period: str
    avg_pm25: float
    avg_pm10: float
    avg_risk: float
    hotspots: int
    reports: int


class SourceBreakdown(BaseModel):
    source: str
    label: str
    count: int
    share_pct: float


class RegionDistribution(BaseModel):
    region_code: str
    name: str
    hotspots: int
    avg_risk: float
    reports: int


class CoveragePoint(BaseModel):
    label: str
    station_coverage_pct: float
    citizen_coverage_pct: float
    combined_coverage_pct: float


class TrendsOut(BaseModel):
    granularity: Literal["daily", "weekly", "monthly"]
    region_code: str
    trends: List[TrendPoint]
    sources: List[SourceBreakdown]
    distribution: List[RegionDistribution]
    participation: List[TrendPoint]
    coverage: List[CoveragePoint]
    coverage_headline: str
    data_mode: DataMode


# --------------------------------------------------------------------------
# BRICS
# --------------------------------------------------------------------------
class BricsNode(BaseModel):
    country_code: str
    country_name: str
    flag: str
    region_code: str
    region_name: str
    node_status: str
    data_mode: DataMode
    population_millions: float
    monitoring_stations: int
    citizen_signals: int
    active_hotspots: int
    avg_risk: float
    model_version: str
    schema_version: str
    last_sync: datetime


class BricsOverviewOut(BaseModel):
    network_name: str
    schema_version: str
    nodes: List[BricsNode]
    shared_schema: Dict[str, Any]
    federation_principles: List[Dict[str, str]]
    interoperability_layers: List[Dict[str, str]]
    aggregate: Dict[str, Any]
    generated_at: datetime
    data_mode: DataMode


# --------------------------------------------------------------------------
# System / demo
# --------------------------------------------------------------------------
class HealthOut(BaseModel):
    status: str
    app: str
    version: str
    environment: str
    database: str
    database_backend: str
    ai_provider: str
    gemini_model: str
    time: datetime
    uptime_seconds: float


class DemoScenarioStep(BaseModel):
    key: str
    title: str
    detail: str
    status: Literal["complete", "pending"] = "complete"
    duration_ms: int = 0
    payload: Dict[str, Any] = {}


class DemoScenarioOut(BaseModel):
    scenario_id: str
    title: str
    narrative: str
    steps: List[DemoScenarioStep]
    report: ReportOut
    assessment: AssessmentOut
    hotspot: HotspotOut
    alert: AlertOut
    forecast: ForecastOut
    ai_provider: str
    total_ms: int


# --------------------------------------------------------------------------
# Contact
# --------------------------------------------------------------------------
class ContactCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    organization: Optional[str] = Field(default=None, max_length=160)
    subject: str = Field(min_length=3, max_length=200)
    message: str = Field(min_length=10, max_length=4000)


class ContactOut(BaseModel):
    id: int
    detail: str
    created_at: datetime


AnalyzeResponse.model_rebuild()
MapLayersOut.model_rebuild()
