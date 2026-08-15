"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Radio } from "lucide-react";

import { DataBadge } from "@/components/dashboard/shared";
import { Skeleton } from "@/components/ui";
import { analyticsApi, forecastApi, reportsApi } from "@/lib/api";
import { formatNumber, riskColor, timeAgo } from "@/lib/utils";

/**
 * Hero visual: a condensed environmental intelligence console.
 *
 * Built from the platform's own vocabulary — a monitoring map with a coverage
 * gap, risk readouts, incoming citizen signals and a forecast trace — rather
 * than a generic AI illustration.
 *
 * Every figure is read live from the API. The map itself is a conceptual
 * diagram of the coverage-gap problem and carries no numbers. When the backend
 * is unreachable the readouts show "—" rather than inventing values.
 */
export function HeroVisual() {
  const overview = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => analyticsApi.overview(),
    retry: false,
  });

  const forecast = useQuery({
    queryKey: ["forecast", 6],
    queryFn: () => forecastApi.get({ horizon_hours: 6 }),
    retry: false,
  });

  const reports = useQuery({
    queryKey: ["reports", "hero-feed"],
    queryFn: () => reportsApi.list({ page: 1, page_size: 4 }),
    retry: false,
  });

  const data = overview.data;
  const loading = overview.isLoading;
  const offline = overview.isError;

  return (
    <div className="hero-visual">
      <div className="hero-panel">
        <div className="hero-panel-header">
          <span className="hero-panel-title">
            <Activity size={15} aria-hidden="true" style={{ color: "var(--primary)" }} />
            {data ? `${data.region_name} — Pollution Intelligence` : "Pollution Intelligence"}
          </span>
          {data ? <DataBadge mode="MODELLED" /> : null}
        </div>

        <div className="hero-panel-body">
          {/* Map: conceptual diagram of the coverage gap, not a data surface. */}
          <div className="hero-map">
            <svg
              viewBox="0 0 420 210"
              role="img"
              aria-label="Diagram of a monitoring region showing pollution hotspots occurring in the coverage gap between fixed monitoring stations"
            >
              <defs>
                <radialGradient id="hotspot-critical" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="#b3372c" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#b3372c" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="hotspot-high" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="#c1611c" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#c1611c" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="hotspot-moderate" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="#a86a12" stopOpacity="0.34" />
                  <stop offset="100%" stopColor="#a86a12" stopOpacity="0" />
                </radialGradient>
              </defs>

              <rect width="420" height="210" fill="#eef3f2" />

              <g stroke="#d3dedc" strokeWidth="1" fill="#e6eeec">
                <path d="M12 18 L140 10 L168 74 L96 118 L20 96 Z" />
                <path d="M140 10 L286 22 L300 88 L168 74 Z" />
                <path d="M286 22 L408 16 L404 96 L300 88 Z" />
                <path d="M20 96 L96 118 L110 194 L26 198 Z" />
                <path d="M96 118 L168 74 L300 88 L286 176 L110 194 Z" />
                <path d="M300 88 L404 96 L400 190 L286 176 Z" />
              </g>

              <path
                d="M40 4 C 120 60, 150 92, 210 118 S 320 176, 356 206"
                stroke="#c5dbe4"
                strokeWidth="5"
                fill="none"
                strokeLinecap="round"
              />

              {/* Coverage radius of fixed monitoring stations */}
              <g
                fill="#1c6394"
                fillOpacity="0.07"
                stroke="#1c6394"
                strokeOpacity="0.22"
                strokeDasharray="3 3"
              >
                <circle cx="86" cy="60" r="46" />
                <circle cx="330" cy="150" r="44" />
              </g>

              <circle cx="238" cy="52" r="52" fill="url(#hotspot-critical)" />
              <circle cx="150" cy="152" r="46" fill="url(#hotspot-high)" />
              <circle cx="352" cy="60" r="38" fill="url(#hotspot-moderate)" />

              <circle
                cx="238"
                cy="52"
                r="8"
                fill="none"
                stroke="#b3372c"
                strokeWidth="1.5"
                className="hotspot-pulse"
              />
              <circle
                cx="150"
                cy="152"
                r="8"
                fill="none"
                stroke="#c1611c"
                strokeWidth="1.5"
                className="hotspot-pulse"
                style={{ animationDelay: "1.1s" }}
              />

              <g stroke="#fff" strokeWidth="2">
                <circle cx="238" cy="52" r="7.5" fill="#b3372c" />
                <circle cx="150" cy="152" r="7" fill="#c1611c" />
                <circle cx="352" cy="60" r="6" fill="#a86a12" />
              </g>

              <g fill="#1c6394" stroke="#fff" strokeWidth="1.5">
                <rect x="81" y="55" width="11" height="11" rx="2" />
                <rect x="325" y="145" width="11" height="11" rx="2" />
                <rect x="196" y="176" width="11" height="11" rx="2" />
              </g>

              <g fill="#4a5c61" stroke="#fff" strokeWidth="1.2">
                <rect x="252" y="76" width="7" height="7" rx="1.5" transform="rotate(45 255.5 79.5)" />
                <rect x="214" y="34" width="7" height="7" rx="1.5" transform="rotate(45 217.5 37.5)" />
                <rect x="130" y="170" width="7" height="7" rx="1.5" transform="rotate(45 133.5 173.5)" />
                <rect x="172" y="136" width="7" height="7" rx="1.5" transform="rotate(45 175.5 139.5)" />
                <rect x="368" y="44" width="7" height="7" rx="1.5" transform="rotate(45 371.5 47.5)" />
              </g>

              {/* The platform's core premise, annotated */}
              <g>
                <line
                  x1="238"
                  y1="52"
                  x2="196"
                  y2="20"
                  stroke="#b3372c"
                  strokeWidth="1"
                  strokeDasharray="3 2"
                />
                <rect x="150" y="6" width="98" height="17" rx="4" fill="#fff" stroke="#f1c9c5" />
                <text
                  x="199"
                  y="18"
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="600"
                  fill="#b3372c"
                  fontFamily="var(--font-sans)"
                >
                  Coverage gap
                </text>
              </g>
            </svg>
          </div>

          {/* Readouts ------------------------------------------------------- */}
          <div className="hero-readouts">
            <Readout
              label="Air Risk"
              loading={loading}
              value={data ? Math.round(data.current_risk) : null}
              suffix="/100"
              color={data ? riskColor(data.current_risk_level) : undefined}
            />
            <Readout
              label="Hotspots"
              loading={loading}
              value={data ? data.active_hotspots : null}
            />
            <Readout
              label="Signals 24h"
              loading={loading}
              value={data ? data.citizen_signals_24h : null}
            />
          </div>

          {/* Forecast ------------------------------------------------------- */}
          <div className="hero-forecast" style={{ marginBottom: 14 }}>
            <div className="hero-forecast-head">
              <span>6-hour risk forecast</span>
              {forecast.data ? (
                <span
                  style={{
                    color: riskColor(forecast.data.trend),
                    fontWeight: 700,
                  }}
                >
                  Peak {Math.round(forecast.data.peak_risk)} · {forecast.data.peak_at}
                </span>
              ) : null}
            </div>

            {forecast.isLoading ? (
              <Skeleton style={{ height: 56 }} />
            ) : forecast.data?.points?.length ? (
              <ForecastTrace points={forecast.data.points.map((p) => p.risk_score)} />
            ) : (
              <p style={{ fontSize: "var(--text-xs)", color: "var(--muted)", padding: "14px 0" }}>
                Forecast unavailable
              </p>
            )}
          </div>

          {/* Signal feed ---------------------------------------------------- */}
          <div>
            <div className="hero-forecast-head" style={{ marginBottom: 2 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Radio size={12} aria-hidden="true" />
                Incoming signals
              </span>
            </div>

            {reports.isLoading ? (
              <>
                <Skeleton className="skeleton-text" style={{ marginTop: 10 }} />
                <Skeleton className="skeleton-text" />
                <Skeleton className="skeleton-text" />
              </>
            ) : reports.data?.items?.length ? (
              reports.data.items.slice(0, 4).map((report) => (
                <div className="hero-signal-row" key={report.id}>
                  <span
                    className="hero-signal-dot"
                    style={{
                      background: report.assessment
                        ? riskColor(report.assessment.risk_level)
                        : "var(--muted)",
                    }}
                    aria-hidden="true"
                  />
                  <span className="hero-signal-label">
                    Citizen report · {report.location_label || "Unnamed location"}
                  </span>
                  <span className="hero-signal-time">{timeAgo(report.created_at)}</span>
                </div>
              ))
            ) : (
              <p style={{ fontSize: "var(--text-xs)", color: "var(--muted)", padding: "12px 0" }}>
                {offline
                  ? "Signal feed unavailable — the AtmosIQ API is unreachable."
                  : "No citizen signals recorded yet."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
function Readout({
  label,
  value,
  suffix,
  color,
  loading,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  color?: string;
  loading: boolean;
}) {
  return (
    <div className="hero-readout">
      <p className="hero-readout-label">{label}</p>
      {loading ? (
        <Skeleton style={{ height: 24, width: "70%" }} />
      ) : (
        <p className="hero-readout-value" style={color ? { color } : undefined}>
          {value === null ? (
            <span style={{ color: "var(--muted)" }}>—</span>
          ) : (
            <>
              {formatNumber(value)}
              {suffix ? (
                <span style={{ fontSize: "var(--text-sm)", color: "var(--muted)" }}>
                  {suffix}
                </span>
              ) : null}
            </>
          )}
        </p>
      )}
    </div>
  );
}

/** Sparkline of the live forecast, scaled to the 0-100 risk range. */
function ForecastTrace({ points }: { points: number[] }) {
  const width = 300;
  const height = 56;
  const top = 6;
  const bottom = 50;

  const toY = (risk: number) => bottom - (Math.max(0, Math.min(100, risk)) / 100) * (bottom - top);
  const step = points.length > 1 ? (width - 8) / (points.length - 1) : 0;

  const coords = points.map((risk, index) => [4 + index * step, toY(risk)] as const);
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} ${width - 4},${height} 4,${height}`;

  const peakIndex = points.indexOf(Math.max(...points));
  const peak = coords[peakIndex];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      height={height}
      width="100%"
      role="img"
      aria-label={`Forecast risk moving from ${Math.round(points[0])} now to ${Math.round(
        points[points.length - 1],
      )} over the next six hours`}
    >
      <defs>
        <linearGradient id="forecast-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f6f66" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#0f6f66" stopOpacity="0" />
        </linearGradient>
      </defs>

      <polygon points={area} fill="url(#forecast-fill)" />
      <polyline
        points={line}
        fill="none"
        stroke="#0f6f66"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {peak ? (
        <circle cx={peak[0]} cy={peak[1]} r="3.5" fill="#b3372c" stroke="#fff" strokeWidth="1.5" />
      ) : null}
    </svg>
  );
}
