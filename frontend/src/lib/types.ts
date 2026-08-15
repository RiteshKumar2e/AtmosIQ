/** Shared API types. These mirror the backend Pydantic schemas exactly. */

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type DataMode = "LIVE" | "SIMULATED" | "MODELLED";
export type Role = "citizen" | "analyst" | "authority" | "admin";
export type AlertStatus = "NEW" | "ACKNOWLEDGED" | "ASSIGNED" | "RESOLVED" | "DISMISSED";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  organisation: string | null;
  country_code: string;
  region_code: string;
  is_demo: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface Contribution {
  factor: string;
  label: string;
  weight_pct: number;
  detail: string;
  direction: "increase" | "decrease" | "neutral";
}

export interface Assessment {
  id: number;
  report_id: number;
  event_type: string;
  severity: string;
  risk_score: number;
  risk_level: RiskLevel;
  hotspot_probability: number;
  confidence: number;
  likely_source: string;
  ai_summary: string;
  recommended_action: string;
  visible_indicators: string[];
  environmental_concerns: string[];
  contributions: Contribution[];
  evidence: Evidence;
  forecast_note: string;
  ai_provider: string;
  model_name: string;
  analysis_ms: number;
  created_at: string;
}

export interface Evidence {
  citizen?: {
    report_type: string;
    description: string;
    image_url: string | null;
    location_label: string;
    coordinates: [number, number];
    submitted_at: string | null;
    corroborating_signals: number;
    data_mode: DataMode;
  };
  citizen_sensor?: {
    pm25: number | null;
    pm10: number | null;
    temperature: number | null;
    humidity: number | null;
    data_mode: DataMode;
    caveat: string;
  } | null;
  ambient_air?: {
    pm25: number | null;
    pm10: number | null;
    no2: number | null;
    aqi: number;
    aqi_category: string;
    who_exceedance: number;
    provider: string;
    data_mode: DataMode;
    note?: string;
  };
  particulates_used?: {
    pm25: number | null;
    pm10: number | null;
    data_mode: DataMode;
    provenance: string;
    note: string;
  };
  weather?: {
    temperature: number;
    humidity: number;
    wind_speed_ms: number;
    wind_direction_deg: number;
    wind_direction_compass: string;
    dispersion_index: number;
    description: string;
    provider: string;
    data_mode: DataMode;
  };
  satellite?: {
    aerosol_optical_depth: number;
    aod_interpretation: string;
    thermal_anomaly_count: number;
    no2_column_umol_m2: number;
    built_up_fraction: number;
    land_context: string;
    data_mode: DataMode;
  };
  nearest_station?: {
    name: string;
    operator: string;
    distance_km: number;
    pm25: number | null;
    data_mode: DataMode;
  } | null;
  vision?: {
    event_type: string;
    event_label: string;
    severity: string;
    confidence: number;
    visible_indicators: string[];
    plume_opacity?: string;
    visibility_impact?: string;
    measurement_caveat: string;
    provider: string;
    data_mode: DataMode;
  };
}

export interface Report {
  id: number;
  user_id: number | null;
  reporter_name: string | null;
  latitude: number;
  longitude: number;
  country_code: string;
  region_code: string;
  location_label: string;
  report_type: string;
  description: string;
  image_url: string | null;
  pm25: number | null;
  pm10: number | null;
  temperature: number | null;
  humidity: number | null;
  status: string;
  data_mode: DataMode;
  is_demo_seed: boolean;
  created_at: string;
  assessment: Assessment | null;
}

export interface ReportList {
  items: Report[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface Hotspot {
  id: number;
  latitude: number;
  longitude: number;
  country_code: string;
  region_code: string;
  location_label: string;
  risk_score: number;
  risk_level: RiskLevel;
  hotspot_probability: number;
  confidence: number;
  pollution_type: string;
  likely_source: string;
  source: string;
  radius_km: number;
  population_exposed: number;
  signal_count: number;
  forecast_note: string;
  forecast_trend: string;
  contributions: Contribution[];
  ai_summary: string;
  recommended_action: string;
  report_id: number | null;
  status: string;
  data_mode: DataMode;
  detected_at: string;
}

export interface MonitoringStation {
  id: number;
  station_code: string;
  name: string;
  latitude: number;
  longitude: number;
  country_code: string;
  region_code: string;
  operator: string;
  coverage_radius_km: number;
  status: string;
  data_mode: DataMode;
  latest_pm25: number | null;
  latest_pm10: number | null;
}

export interface Wind {
  speed_ms: number;
  direction_deg: number;
  direction_compass: string;
  gust_ms: number;
  dispersion_index: number;
  description: string;
  data_mode: DataMode;
}

export interface Corridor {
  hotspot_id: number;
  label: string;
  risk_level: RiskLevel;
  coordinates: [number, number][];
  travel_km: number;
  bearing_compass: string;
  data_mode: DataMode;
}

export interface MapLayers {
  hotspots: Hotspot[];
  reports: Report[];
  stations: MonitoringStation[];
  wind: Wind;
  corridors: Corridor[];
  generated_at: string;
}

export interface Alert {
  id: number;
  hotspot_id: number | null;
  severity: RiskLevel;
  title: string;
  description: string;
  location_label: string;
  country_code: string;
  region_code: string;
  risk_score: number;
  forecast_trend: string;
  recommended_action: string;
  status: AlertStatus;
  assigned_to: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  data_mode: DataMode;
  created_at: string;
}

export interface AlertSummary {
  total: number;
  new: number;
  acknowledged: number;
  assigned: number;
  resolved: number;
  dismissed: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
}

export interface ForecastPoint {
  timestamp: string;
  hour_label: string;
  risk_score: number;
  lower_bound: number;
  upper_bound: number;
  pm25_estimate: number;
  confidence: number;
}

export interface Forecast {
  region_code: string;
  country_code: string;
  horizon_hours: number;
  generated_at: string;
  current_risk: number;
  peak_risk: number;
  peak_at: string;
  trend: string;
  points: ForecastPoint[];
  contributing_factors: Contribution[];
  model_name: string;
  model_note: string;
  data_mode: DataMode;
  ai_summary: string;
}

export interface Kpi {
  label: string;
  value: number;
  unit: string;
  delta_pct: number | null;
  level: string | null;
  data_mode: DataMode;
  hint: string;
}

export interface Overview {
  region_code: string;
  country_code: string;
  region_name: string;
  generated_at: string;
  kpis: Kpi[];
  current_risk: number;
  current_risk_level: RiskLevel;
  active_hotspots: number;
  citizen_signals_24h: number;
  critical_alerts: number;
  wind: Wind;
  air_quality: {
    pm25: number;
    pm10: number;
    no2: number | null;
    aqi: number;
    aqi_category: string;
    who_exceedance: number;
    provider: string;
    data_mode: DataMode;
    temperature: number;
    humidity: number;
  };
  ai_provider: string;
  top_hotspots: Hotspot[];
  recent_alerts: Alert[];
  explainability: Contribution[];
  reasoning_summary: string;
}

export interface TrendPoint {
  period: string;
  avg_pm25: number;
  avg_pm10: number;
  avg_risk: number;
  hotspots: number;
  reports: number;
}

export interface SourceBreakdown {
  source: string;
  label: string;
  count: number;
  share_pct: number;
}

export interface RegionDistribution {
  region_code: string;
  name: string;
  hotspots: number;
  avg_risk: number;
  reports: number;
}

export interface CoveragePoint {
  label: string;
  station_coverage_pct: number;
  citizen_coverage_pct: number;
  combined_coverage_pct: number;
}

export interface Trends {
  granularity: "daily" | "weekly" | "monthly";
  region_code: string;
  trends: TrendPoint[];
  sources: SourceBreakdown[];
  distribution: RegionDistribution[];
  participation: TrendPoint[];
  coverage: CoveragePoint[];
  coverage_headline: string;
  data_mode: DataMode;
}

export interface BricsNode {
  country_code: string;
  country_name: string;
  flag: string;
  region_code: string;
  region_name: string;
  node_status: string;
  data_mode: DataMode;
  population_millions: number;
  monitoring_stations: number;
  citizen_signals: number;
  active_hotspots: number;
  avg_risk: number;
  model_version: string;
  schema_version: string;
  last_sync: string;
}

export interface BricsOverview {
  network_name: string;
  schema_version: string;
  nodes: BricsNode[];
  shared_schema: {
    version: string;
    identifiers: Record<string, string>;
    risk_model: {
      score_range: string;
      bands: Record<string, string>;
      feature_weights: Record<string, number>;
      note: string;
    };
    forecast_model: Record<string, unknown>;
    exchanged_entities: { entity: string; personal_data: boolean; detail: string }[];
    never_exchanged: string[];
  };
  federation_principles: { title: string; detail: string }[];
  interoperability_layers: { layer: string; name: string; detail: string }[];
  aggregate: Record<string, number>;
  generated_at: string;
  data_mode: DataMode;
}

export interface Health {
  status: string;
  app: string;
  version: string;
  environment: string;
  database: string;
  ai_provider: string;
  gemini_model: string;
  time: string;
  uptime_seconds: number;
}

export interface ResponsibleAi {
  ai_provider: string;
  model: string;
  limitations: { title: string; detail: string }[];
  data_modes: Record<string, string>;
}

export interface AnalyzeResponse {
  report: Report;
  assessment: Assessment | null;
  hotspot: Hotspot | null;
  alert: Alert | null;
  ai_provider: string;
  pipeline: string[];
}

export interface ScenarioStep {
  key: string;
  title: string;
  detail: string;
  status: "complete" | "pending";
  duration_ms: number;
  payload: Record<string, unknown>;
}

export interface ScenarioOutline {
  title: string;
  narrative: string;
  duration_estimate_seconds: number;
  steps: { key: string; title: string; detail: string }[];
  ai_provider: string;
}

export interface ScenarioResult {
  scenario_id: string;
  title: string;
  narrative: string;
  steps: ScenarioStep[];
  report: Report;
  assessment: Assessment;
  hotspot: Hotspot;
  alert: Alert;
  forecast: Forecast;
  ai_provider: string;
  total_ms: number;
}

export interface HotspotSignals {
  hotspot_id: number;
  radius_km: number;
  citizen_signals: Report[];
  citizen_signal_count: number;
  nearest_stations: {
    name: string;
    operator: string;
    distance_km: number;
    status: string;
    data_mode: DataMode;
  }[];
  coverage_gap_km: number | null;
}
