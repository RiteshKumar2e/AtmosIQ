/**
 * TypeScript mirrors of the AtmosIQ FastAPI response schemas.
 * Kept field-for-field in sync with `backend/app/schemas/schemas.py`.
 */

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type DataMode = "LIVE" | "SIMULATED" | "MODELLED";
export type Role = "citizen" | "analyst" | "authority" | "admin";

export type AlertStatus =
  | "NEW"
  | "ACKNOWLEDGED"
  | "ASSIGNED"
  | "RESOLVED"
  | "DISMISSED";

export type ReportType =
  | "smoke"
  | "dust"
  | "burning"
  | "industrial_emission"
  | "smog"
  | "other";

/* -------------------------------------------------------------------------- */
/* Auth                                                                       */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/* Reports & assessments                                                      */
/* -------------------------------------------------------------------------- */
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
  evidence: Record<string, unknown>;
  forecast_note: string;
  ai_provider: string;
  model_name: string;
  analysis_ms: number;
  created_at: string;
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
  report_type: ReportType | string;
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

export interface AnalyzeResponse {
  report: Report;
  assessment: Assessment | null;
  hotspot: Hotspot | null;
  alert: Alert | null;
  ai_provider: string;
  pipeline: string[];
}

/* -------------------------------------------------------------------------- */
/* Hotspots & map                                                             */
/* -------------------------------------------------------------------------- */
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

export interface MapLayers {
  hotspots: Hotspot[];
  reports: Report[];
  stations: MonitoringStation[];
  wind: Wind;
  corridors: Record<string, unknown>[];
  generated_at: string;
}

/* -------------------------------------------------------------------------- */
/* Alerts                                                                     */
/* -------------------------------------------------------------------------- */
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
  status: string;
  assigned_to: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  data_mode: DataMode;
  created_at: string;
}

export interface AlertSummary {
  total: number;
  by_status: Record<string, number>;
  by_severity: Record<string, number>;
  [key: string]: unknown;
}

/* -------------------------------------------------------------------------- */
/* Forecast                                                                   */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/* Analytics                                                                  */
/* -------------------------------------------------------------------------- */
export interface Kpi {
  label: string;
  value: number;
  unit: string;
  delta_pct: number | null;
  level: string | null;
  data_mode: DataMode;
  hint: string;
}

export interface AnalyticsOverview {
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
  air_quality: Record<string, any>;
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

export interface AnalyticsTrends {
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

/* -------------------------------------------------------------------------- */
/* BRICS                                                                      */
/* -------------------------------------------------------------------------- */
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
  shared_schema: Record<string, any>;
  federation_principles: { title: string; detail: string }[];
  interoperability_layers: { title: string; detail: string }[];
  aggregate: Record<string, any>;
  generated_at: string;
  data_mode: DataMode;
}

/* -------------------------------------------------------------------------- */
/* Demo scenario & system                                                     */
/* -------------------------------------------------------------------------- */
export interface DemoScenarioStep {
  key: string;
  title: string;
  detail: string;
  status: "complete" | "pending";
  duration_ms: number;
  payload: Record<string, any>;
}

export interface DemoScenario {
  scenario_id: string;
  title: string;
  narrative: string;
  steps: DemoScenarioStep[];
  report: Report;
  assessment: Assessment;
  hotspot: Hotspot;
  alert: Alert;
  forecast: Forecast;
  ai_provider: string;
  total_ms: number;
}

export interface Health {
  status: string;
  app: string;
  version: string;
  environment: string;
  database: string;
  database_backend: string;
  ai_provider: string;
  gemini_model: string;
  time: string;
  uptime_seconds: number;
}

export interface ResponsibleAi {
  [key: string]: any;
}

export interface ContactPayload {
  full_name: string;
  email: string;
  organization?: string;
  subject: string;
  message: string;
}
