import type { ReportType } from "@/types";

export const APP_NAME = "AtmosIQ";
export const APP_TAGLINE = "See pollution before it becomes a crisis.";
export const APP_DESCRIPTION =
  "AtmosIQ combines citizen observations, environmental signals, AI-powered analysis, and predictive intelligence to detect hyperlocal pollution risks before they escalate.";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "";

/** Storage keys for the client-side session. */
export const TOKEN_KEY = "atmosiq.token";
export const USER_KEY = "atmosiq.user";

/* -------------------------------------------------------------------------- */
/* Navigation                                                                 */
/* -------------------------------------------------------------------------- */
export const PUBLIC_NAV = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Features", href: "/features" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Contact", href: "/contact" },
] as const;

export const DASHBOARD_NAV = [
  { label: "Overview", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Intelligence", href: "/dashboard/intelligence", icon: "BrainCircuit" },
  { label: "Hotspots", href: "/dashboard/hotspots", icon: "MapPinned" },
  { label: "Reports", href: "/dashboard/reports", icon: "FileText" },
  { label: "Forecast", href: "/dashboard/forecast", icon: "TrendingUp" },
  { label: "Alerts", href: "/dashboard/alerts", icon: "BellRing" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "BarChart3" },
  { label: "BRICS Network", href: "/dashboard/brics-network", icon: "Globe2" },
] as const;

export const DASHBOARD_FOOTER_NAV = [
  { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
] as const;

/* -------------------------------------------------------------------------- */
/* Domain vocabulary                                                          */
/* -------------------------------------------------------------------------- */
export const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
  { value: "smoke", label: "Smoke", description: "Visible smoke plume from any source" },
  { value: "dust", label: "Dust", description: "Construction, demolition or road dust" },
  { value: "burning", label: "Burning", description: "Open waste or crop residue burning" },
  {
    value: "industrial_emission",
    label: "Industrial Emission",
    description: "Stack or process emissions from an industrial unit",
  },
  { value: "smog", label: "Smog / Haze", description: "Widespread haze with reduced visibility" },
  { value: "other", label: "Other", description: "Anything not covered by the categories above" },
];

export const USER_ROLES = [
  {
    value: "citizen",
    label: "Citizen",
    description: "Submit pollution observations from your area",
  },
  {
    value: "analyst",
    label: "Analyst",
    description: "Investigate hotspots, trends and forecasts",
  },
  {
    value: "authority",
    label: "Authority",
    description: "Receive and act on early-warning alerts",
  },
] as const;

export const ALERT_STATUSES = [
  { value: "NEW", label: "New" },
  { value: "ACKNOWLEDGED", label: "Acknowledged" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "DISMISSED", label: "Dismissed" },
] as const;

export const RISK_LEVELS = ["LOW", "MODERATE", "HIGH", "CRITICAL"] as const;

/** Default map view: the primary demonstration region. */
export const DEFAULT_MAP_CENTER: [number, number] = [77.209, 28.6139];
export const DEFAULT_MAP_ZOOM = 9.6;

/**
 * The responsible-AI statement shown wherever AtmosIQ presents a model output.
 * Required on every page that displays an AI assessment or a modelled score.
 */
export const RESPONSIBLE_AI_NOTICE =
  "AI-generated environmental assessments are decision-support signals and should not replace certified air-quality measurements or official environmental monitoring.";

export const DATA_STATUS_LEGEND = [
  {
    label: "LIVE",
    description: "Measured in real time by an external data provider.",
  },
  {
    label: "SIMULATED",
    description: "Synthetic demonstration data, deterministic and reproducible.",
  },
  {
    label: "MODELLED",
    description: "Derived by the AtmosIQ risk or forecast engine.",
  },
  {
    label: "AI ASSESSMENT",
    description: "Produced by multimodal AI analysis of a citizen submission.",
  },
];

export const BRICS_COUNTRIES = [
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
] as const;
