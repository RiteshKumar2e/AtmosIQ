/**
 * Typed API client.
 *
 * The Gemini key lives only on the FastAPI server — this client never sees it
 * and never could: every AI call is made server-side behind these endpoints.
 */

import type {
  Alert,
  AlertStatus,
  AlertSummary,
  AnalyzeResponse,
  BricsOverview,
  Forecast,
  Health,
  Hotspot,
  HotspotSignals,
  MapLayers,
  Overview,
  Report,
  ReportList,
  ResponsibleAi,
  ScenarioOutline,
  ScenarioResult,
  TokenResponse,
  Trends,
  User,
} from "./types";

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

const TOKEN_KEY = "aeroshield.token";

export class ApiError extends Error {
  status: number;
  fields?: { field: string; message: string }[];

  constructor(status: number, message: string, fields?: { field: string; message: string }[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

/** Absolute URL for an image served by the backend. */
export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = false, headers, ...init } = options;
  const finalHeaders = new Headers(headers);

  if (auth) {
    const token = getToken();
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  }
  if (init.body && !(init.body instanceof FormData) && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers: finalHeaders });
  } catch {
    // Distinguish "the server is down" from "the server said no" — the first
    // is the overwhelmingly common local-setup failure and deserves a hint.
    throw new ApiError(
      0,
      `Cannot reach the AeroShield API at ${API_URL}. Make sure the backend is running.`,
    );
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const body = payload as
      | { error?: { message?: string; fields?: { field: string; message: string }[] }; detail?: string }
      | null;
    const message =
      body?.error?.message ||
      body?.detail ||
      `Request failed with status ${response.status}`;

    if (response.status === 401 && typeof window !== "undefined" && getToken()) {
      setToken(null);
    }
    throw new ApiError(response.status, message, body?.error?.fields);
  }

  return payload as T;
}

function query(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const api = {
  // --- System ------------------------------------------------------------
  health: () => request<Health>("/api/health"),
  responsibleAi: () => request<ResponsibleAi>("/api/analytics/responsible-ai"),

  // --- Auth --------------------------------------------------------------
  login: (email: string, password: string) =>
    request<TokenResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (payload: {
    name: string;
    email: string;
    password: string;
    role?: string;
    organisation?: string;
  }) =>
    request<TokenResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  demoLogin: (role: "authority" | "analyst" | "citizen") =>
    request<TokenResponse>("/api/auth/demo-login", {
      method: "POST",
      body: JSON.stringify({ role }),
    }),

  me: () => request<User>("/api/auth/me", { auth: true }),

  logout: () => request<{ detail: string }>("/api/auth/logout", { method: "POST", auth: true }),

  // --- Reports -----------------------------------------------------------
  reports: (params: {
    region_code?: string;
    report_type?: string;
    status?: string;
    page?: number;
    page_size?: number;
  } = {}) => request<ReportList>(`/api/reports${query(params)}`),

  report: (id: number) => request<Report>(`/api/reports/${id}`),

  reportTypes: () =>
    request<{ types: { value: string; label: string }[] }>("/api/reports/types"),

  createReport: (form: FormData) =>
    request<AnalyzeResponse>("/api/reports", { method: "POST", body: form, auth: true }),

  analyzeReport: (id: number) =>
    request<AnalyzeResponse>(`/api/reports/${id}/analyze`, { method: "POST", auth: true }),

  // --- Hotspots ----------------------------------------------------------
  hotspots: (params: { region_code?: string; risk_level?: string; status?: string; limit?: number } = {}) =>
    request<Hotspot[]>(`/api/hotspots${query(params)}`),

  hotspot: (id: number) => request<Hotspot>(`/api/hotspots/${id}`),

  hotspotSignals: (id: number, radius_km = 3) =>
    request<HotspotSignals>(`/api/hotspots/${id}/signals${query({ radius_km })}`),

  mapLayers: (region_code?: string) =>
    request<MapLayers>(`/api/hotspots/map${query({ region_code })}`),

  // --- Forecast ----------------------------------------------------------
  forecast: (params: { region_code?: string; horizon_hours?: number } = {}) =>
    request<Forecast>(`/api/forecast${query(params)}`),

  // --- Alerts ------------------------------------------------------------
  alerts: (params: { region_code?: string; severity?: string; status?: string; limit?: number } = {}) =>
    request<Alert[]>(`/api/alerts${query(params)}`),

  alertSummary: (region_code?: string) =>
    request<AlertSummary>(`/api/alerts/summary${query({ region_code })}`),

  updateAlert: (id: number, payload: { status?: AlertStatus; assigned_to?: string }) =>
    request<Alert>(`/api/alerts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
      auth: true,
    }),

  // --- Analytics ---------------------------------------------------------
  overview: (region_code?: string) =>
    request<Overview>(`/api/analytics/overview${query({ region_code })}`),

  trends: (params: { region_code?: string; granularity?: string } = {}) =>
    request<Trends>(`/api/analytics/trends${query(params)}`),

  // --- BRICS -------------------------------------------------------------
  brics: () => request<BricsOverview>("/api/brics/overview"),

  // --- Demo scenario -----------------------------------------------------
  scenarioOutline: () => request<ScenarioOutline>("/api/demo/scenario"),

  runScenario: (region_code?: string) =>
    request<ScenarioResult>(`/api/demo/scenario/run${query({ region_code })}`, {
      method: "POST",
      auth: true,
    }),

  resetScenario: () =>
    request<{ detail: string; reports_removed: number; hotspots_removed: number; alerts_removed: number }>(
      "/api/demo/reset",
      { method: "POST", auth: true },
    ),
};
