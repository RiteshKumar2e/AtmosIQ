/**
 * Typed client for the AtmosIQ FastAPI backend.
 *
 * The backend returns errors in a consistent envelope:
 *   { "error": { "status": 422, "message": "...", "fields": [...] } }
 * `ApiError` unwraps that so every caller gets a readable message.
 */

import { clearSession, getToken, isTokenExpired } from "@/lib/auth";
import { API_URL } from "@/lib/constants";
import type {
  Alert,
  AlertStatus,
  AlertSummary,
  AnalyticsOverview,
  AnalyticsTrends,
  AnalyzeResponse,
  BricsOverview,
  ContactPayload,
  DemoScenario,
  Forecast,
  Health,
  Hotspot,
  MapLayers,
  RegionList,
  Report,
  ReportList,
  ResponsibleAi,
  Role,
  TokenResponse,
  User,
} from "@/types";

export class ApiError extends Error {
  readonly status: number;
  readonly fields: { field: string; message: string }[];

  constructor(status: number, message: string, fields: { field: string; message: string }[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

/**
 * The bearer token to send, if any.
 *
 * An already-expired token is dropped and the session cleared here rather than
 * being sent: the request would fail regardless, and clearing early lets the
 * dashboard guard redirect immediately instead of after a failed round trip.
 */
function readToken(): string | null {
  const token = getToken();
  if (!token) return null;

  if (isTokenExpired(token)) {
    clearSession();
    return null;
  }
  return token;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Attach the bearer token when a session exists. Defaults to true. */
  auth?: boolean;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Abort after this many milliseconds. Defaults to `DEFAULT_TIMEOUT_MS`. */
  timeoutMs?: number;
}

/**
 * A request that has not answered in this long is not going to.
 *
 * The database is remote, so a cold aggregate can legitimately take several
 * seconds — but without a ceiling a stalled backend leaves the UI spinning
 * indefinitely rather than showing its offline state.
 */
const DEFAULT_TIMEOUT_MS = 20_000;

/** Uploads carry an image and run the AI pipeline, so they get longer. */
const UPLOAD_TIMEOUT_MS = 90_000;

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, query, headers, timeoutMs, ...rest } = options;

  const url = new URL(`${API_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const requestHeaders = new Headers(headers);
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  if (body !== undefined && !isFormData) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = readToken();
    if (token) requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const limit = timeoutMs ?? (isFormData ? UPLOAD_TIMEOUT_MS : DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), limit);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      ...rest,
      headers: requestHeaders,
      signal: controller.signal,
      body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    // Distinguish "took too long" from "could not connect": they point the
    // user at different problems.
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(
        408,
        `The AtmosIQ API did not respond within ${Math.round(limit / 1000)}s. It may be starting up or under load.`,
      );
    }
    // Network-level failure: the backend is unreachable rather than erroring.
    throw new ApiError(
      0,
      "Cannot reach the AtmosIQ API. Confirm the backend is running on " + API_URL,
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 204) return undefined as T;

  const raw = await response.text();
  let payload: any = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const envelope = payload?.error;
    const message =
      envelope?.message ??
      (typeof payload?.detail === "string" ? payload.detail : null) ??
      `Request failed with status ${response.status}`;

    // The token was rejected: it is expired, revoked, or signed with a
    // different key. Drop it so the app stops presenting a signed-in UI —
    // `subscribeToSession` wakes every useAuth(), and AuthGuard redirects.
    // Only for authenticated calls: a 401 from a public endpoint says nothing
    // about the validity of the session.
    if (response.status === 401 && auth) {
      clearSession();
    }

    throw new ApiError(response.status, message, envelope?.fields ?? []);
  }

  return payload as T;
}

/* -------------------------------------------------------------------------- */
/* Authentication                                                             */
/* -------------------------------------------------------------------------- */
export const authApi = {
  register: (payload: {
    name: string;
    email: string;
    password: string;
    role: Role;
    organisation?: string | null;
    country_code?: string;
    region_code?: string;
  }) =>
    request<TokenResponse>("/api/auth/register", {
      method: "POST",
      auth: false,
      body: {
        country_code: "IN",
        region_code: "IN-DL",
        ...payload,
      },
    }),

  login: (payload: { email: string; password: string }) =>
    request<TokenResponse>("/api/auth/login", {
      method: "POST",
      auth: false,
      body: payload,
    }),

  demoLogin: (role: "authority" | "analyst" | "citizen" = "analyst") =>
    request<TokenResponse>("/api/auth/demo-login", {
      method: "POST",
      auth: false,
      body: { role },
    }),

  forgotPassword: (email: string) =>
    request<{ detail: string; note?: string }>("/api/auth/forgot-password", {
      method: "POST",
      auth: false,
      body: { email },
    }),

  me: () => request<User>("/api/auth/me"),

  logout: () => request<{ detail: string }>("/api/auth/logout", { method: "POST" }),
};

/* -------------------------------------------------------------------------- */
/* Citizen reports                                                            */
/* -------------------------------------------------------------------------- */
export const reportsApi = {
  types: () => request<{ types: { value: string; label: string }[] }>("/api/reports/types", { auth: false }),

  list: (params: {
    page?: number;
    page_size?: number;
    status?: string;
    report_type?: string;
    region_code?: string;
  } = {}) => request<ReportList>("/api/reports", { auth: false, query: params }),

  get: (id: number) => request<Report>(`/api/reports/${id}`, { auth: false }),

  create: (form: FormData) =>
    request<AnalyzeResponse>("/api/reports", { method: "POST", body: form }),

  analyze: (id: number) =>
    request<AnalyzeResponse>(`/api/reports/${id}/analyze`, { method: "POST" }),
};

/* -------------------------------------------------------------------------- */
/* Hotspots                                                                   */
/* -------------------------------------------------------------------------- */
export const hotspotsApi = {
  list: (params: { status?: string; risk_level?: string; limit?: number; region_code?: string } = {}) =>
    request<Hotspot[]>("/api/hotspots", { auth: false, query: params }),

  map: (regionCode?: string) =>
    request<MapLayers>("/api/hotspots/map", { auth: false, query: { region_code: regionCode } }),

  get: (id: number) => request<Hotspot>(`/api/hotspots/${id}`, { auth: false }),

  signals: (id: number) => request<any>(`/api/hotspots/${id}/signals`, { auth: false }),
};

/* -------------------------------------------------------------------------- */
/* Forecast                                                                   */
/* -------------------------------------------------------------------------- */
export const forecastApi = {
  get: (params: { horizon_hours?: number; region_code?: string } = {}) =>
    request<Forecast>("/api/forecast", { auth: false, query: params }),
};

/* -------------------------------------------------------------------------- */
/* Alerts                                                                     */
/* -------------------------------------------------------------------------- */
export const alertsApi = {
  list: (params: { status?: string; severity?: string; limit?: number; region_code?: string } = {}) =>
    request<Alert[]>("/api/alerts", { auth: false, query: params }),

  summary: () => request<AlertSummary>("/api/alerts/summary", { auth: false }),

  get: (id: number) => request<Alert>(`/api/alerts/${id}`, { auth: false }),

  update: (id: number, payload: { status?: AlertStatus; assigned_to?: string | null }) =>
    request<Alert>(`/api/alerts/${id}`, { method: "PATCH", body: payload }),
};

/* -------------------------------------------------------------------------- */
/* Analytics                                                                  */
/* -------------------------------------------------------------------------- */
export const analyticsApi = {
  overview: (regionCode?: string) =>
    request<AnalyticsOverview>("/api/analytics/overview", {
      auth: false,
      query: { region_code: regionCode },
    }),

  trends: (params: { granularity?: "daily" | "weekly" | "monthly"; region_code?: string } = {}) =>
    request<AnalyticsTrends>("/api/analytics/trends", { auth: false, query: params }),

  responsibleAi: () => request<ResponsibleAi>("/api/analytics/responsible-ai", { auth: false }),
};

/* -------------------------------------------------------------------------- */
/* BRICS network                                                              */
/* -------------------------------------------------------------------------- */
export const bricsApi = {
  overview: (countryCode?: string) =>
    request<BricsOverview>("/api/brics/overview", {
      auth: false,
      query: { country_code: countryCode },
    }),

  node: (countryCode: string) =>
    request<any>(`/api/brics/nodes/${countryCode}`, { auth: false }),
};

/* -------------------------------------------------------------------------- */
/* Demo scenario                                                              */
/* -------------------------------------------------------------------------- */
export const demoApi = {
  outline: () => request<any>("/api/demo/scenario", { auth: false }),
  run: (regionCode?: string) =>
    request<DemoScenario>("/api/demo/scenario/run", {
      method: "POST",
      query: { region_code: regionCode },
    }),
};

/* -------------------------------------------------------------------------- */
/* Contact & system                                                           */
/* -------------------------------------------------------------------------- */
export const contactApi = {
  send: (payload: ContactPayload) =>
    request<{ id: number; detail: string; created_at: string }>("/api/contact", {
      method: "POST",
      auth: false,
      body: payload,
    }),
};

export const regionsApi = {
  list: () => request<RegionList>("/api/regions", { auth: false }),
};

export const systemApi = {
  health: () => request<Health>("/api/health", { auth: false }),
};

/** Absolute URL for an image path returned by the backend. */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
