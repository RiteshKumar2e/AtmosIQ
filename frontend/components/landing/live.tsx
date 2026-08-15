"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Gauge, MapPinned, WifiOff } from "lucide-react";
import Link from "next/link";

import { DataBadge } from "@/components/dashboard/shared";
import { Skeleton } from "@/components/ui";
import { alertsApi, analyticsApi, bricsApi, hotspotsApi, reportsApi } from "@/lib/api";
import { formatNumber, riskKey, titleCase } from "@/lib/utils";

/**
 * Home page sections backed by live API data.
 *
 * These are the only public-facing surfaces that show numbers, so they read
 * from the API rather than carrying hardcoded figures. When the backend is
 * unreachable they show an explicit offline state — never a fabricated value.
 */

/* ========================================================================== */
/* Intelligence preview                                                       */
/* ========================================================================== */
export function IntelligencePreview() {
  const overview = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => analyticsApi.overview(),
    retry: false,
  });

  const data = overview.data;
  const offline = overview.isError;
  const loading = overview.isLoading;

  const metrics = [
    {
      label: "Current Air Risk",
      value: data ? Math.round(data.current_risk) : null,
      suffix: " / 100",
      mode: "MODELLED",
      meta: data ? `${data.current_risk_level} risk band` : "Awaiting data",
    },
    {
      label: "Active Hotspots",
      value: data ? data.active_hotspots : null,
      suffix: "",
      mode: "MODELLED",
      meta: data ? `In ${data.region_name}` : "Awaiting data",
    },
    {
      label: "Citizen Signals",
      value: data ? data.citizen_signals_24h : null,
      suffix: "",
      mode: "SIMULATED",
      meta: "Last 24 hours",
    },
    {
      label: "Critical Alerts",
      value: data ? data.critical_alerts : null,
      suffix: "",
      mode: "MODELLED",
      meta: "Awaiting action",
    },
  ];

  return (
    <section className="section intel-preview">
      <div className="container">
        <div className="section-header centered">
          <p className="eyebrow">
            <Activity size={13} aria-hidden="true" />
            Intelligence Preview
          </p>
          <h2>The operational picture, in one view.</h2>
          <p className="section-lead">
            Everything an air-quality officer needs to triage a morning: where risk is
            concentrated, which signals corroborate it, and what to do next.
          </p>
        </div>

        <div className="intel-preview-panel">
          <div className="intel-preview-bar">
            <span className="intel-preview-bar-title">
              <MapPinned size={16} aria-hidden="true" style={{ color: "var(--primary)" }} />
              {data ? `${data.region_name} — Regional Intelligence` : "Regional Intelligence"}
            </span>
            {data ? <DataBadge mode="MODELLED" /> : null}
          </div>

          <div className="intel-preview-metrics">
            {metrics.map((metric) => (
              <div className="intel-metric" key={metric.label}>
                <p className="intel-metric-label">{metric.label}</p>
                {loading ? (
                  <Skeleton style={{ height: 34, width: "60%" }} />
                ) : (
                  <p className="intel-metric-value">
                    {metric.value === null ? (
                      <span style={{ color: "var(--muted)" }}>—</span>
                    ) : (
                      <>
                        {formatNumber(metric.value)}
                        {metric.suffix ? <small>{metric.suffix}</small> : null}
                      </>
                    )}
                  </p>
                )}
                <p className="intel-metric-meta">
                  {data ? <DataBadge mode={metric.mode} /> : null}
                  {offline ? "Backend unreachable" : metric.meta}
                </p>
              </div>
            ))}
          </div>

          <div className="intel-preview-grid">
            <div className="intel-preview-map">
              <p className="intel-side-title">Risk distribution</p>
              <PreviewMap />
            </div>

            <div className="intel-preview-side">
              <p className="intel-side-title">Highest-risk hotspots</p>

              {loading ? (
                <>
                  <Skeleton className="skeleton-text" />
                  <Skeleton className="skeleton-text" />
                  <Skeleton className="skeleton-text" />
                  <Skeleton className="skeleton-text" />
                </>
              ) : offline ? (
                <p
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: "var(--text-sm)",
                    color: "var(--muted)",
                    paddingTop: 12,
                  }}
                >
                  <WifiOff size={15} aria-hidden="true" />
                  The AtmosIQ API is unreachable.
                </p>
              ) : !data?.top_hotspots?.length ? (
                <p
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--muted)",
                    paddingTop: 12,
                  }}
                >
                  No hotspot currently clears the detection threshold in this region.
                </p>
              ) : (
                data.top_hotspots.slice(0, 4).map((hotspot, index) => (
                  <div className="intel-hotspot-row" key={hotspot.id}>
                    <span className="intel-hotspot-rank">{index + 1}</span>
                    <div className="intel-hotspot-body">
                      <p className="intel-hotspot-name">{hotspot.location_label}</p>
                      <p className="intel-hotspot-meta">{titleCase(hotspot.likely_source)}</p>
                    </div>
                    <span className={`hotspot-score is-${riskKey(hotspot.risk_level)}`}>
                      {Math.round(hotspot.risk_score)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="intel-preview-footer">
            <span>
              Live figures from the AtmosIQ API. Values labelled SIMULATED or MODELLED are not
              certified regulatory measurements.
            </span>
            <Link href="/dashboard" className="auth-link">
              Open the full dashboard →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Conceptual choropleth of regional risk. Carries no numeric claims. */
function PreviewMap() {
  return (
    <div className="static-map" style={{ height: 300 }}>
      <svg
        viewBox="0 0 460 300"
        role="img"
        aria-label="Conceptual map showing pollution risk concentrated in an industrial corridor away from the fixed monitoring stations"
      >
        <rect width="460" height="300" fill="#eef3f2" />

        <g stroke="#d3dedc" strokeWidth="1.2">
          <path d="M14 24 L150 12 L182 96 L104 150 L22 124 Z" fill="#f6dcd6" />
          <path d="M150 12 L316 26 L332 112 L182 96 Z" fill="#fbe9e6" />
          <path d="M316 26 L448 20 L444 122 L332 112 Z" fill="#fdf2e0" />
          <path d="M22 124 L104 150 L120 278 L28 284 Z" fill="#fdf2e0" />
          <path d="M104 150 L182 96 L332 112 L316 240 L120 278 Z" fill="#f9e6e2" />
          <path d="M332 112 L444 122 L440 272 L316 240 Z" fill="#e9f3ec" />
        </g>

        <path
          d="M46 6 C 140 84, 176 130, 240 166 S 356 244, 396 296"
          stroke="#c5dbe4"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />

        <g stroke="#fff" strokeWidth="2.2">
          <circle cx="78" cy="70" r="13" fill="#b3372c" fillOpacity="0.9" />
          <circle cx="268" cy="66" r="12" fill="#b3372c" fillOpacity="0.9" />
          <circle cx="232" cy="196" r="11" fill="#b3372c" fillOpacity="0.85" />
          <circle cx="150" cy="210" r="9.5" fill="#c1611c" fillOpacity="0.9" />
          <circle cx="356" cy="80" r="8.5" fill="#a86a12" fillOpacity="0.9" />
          <circle cx="380" cy="196" r="7.5" fill="#2c7a56" fillOpacity="0.9" />
        </g>

        <g fill="#1c6394" stroke="#fff" strokeWidth="1.6">
          <rect x="118" y="112" width="12" height="12" rx="2.5" />
          <rect x="300" y="150" width="12" height="12" rx="2.5" />
          <rect x="196" y="252" width="12" height="12" rx="2.5" />
          <rect x="404" y="60" width="12" height="12" rx="2.5" />
        </g>
      </svg>

      <div className="map-legend" style={{ position: "absolute" }}>
        <p className="map-legend-title">Risk level</p>
        <div className="map-legend-items">
          <span className="map-legend-item">
            <span className="map-legend-swatch" style={{ background: "#b3372c" }} />
            Critical
          </span>
          <span className="map-legend-item">
            <span className="map-legend-swatch" style={{ background: "#c1611c" }} />
            High
          </span>
          <span className="map-legend-item">
            <span className="map-legend-swatch is-station" />
            Monitoring station
          </span>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Impact                                                                     */
/* ========================================================================== */
export function ImpactSection() {
  const brics = useQuery({
    queryKey: ["brics", "overview"],
    queryFn: () => bricsApi.overview(),
    retry: false,
  });

  const reports = useQuery({
    queryKey: ["reports", "impact-total"],
    queryFn: () => reportsApi.list({ page: 1, page_size: 1 }),
    retry: false,
  });

  const hotspots = useQuery({
    queryKey: ["hotspots", "impact-total"],
    queryFn: () => hotspotsApi.list({ status: "ALL", limit: 500 }),
    retry: false,
  });

  const alerts = useQuery({
    queryKey: ["alerts", "impact-total"],
    queryFn: () => alertsApi.list({ limit: 200 }),
    retry: false,
  });

  const loading =
    brics.isLoading || reports.isLoading || hotspots.isLoading || alerts.isLoading;
  const offline =
    brics.isError && reports.isError && hotspots.isError && alerts.isError;

  const activeAlerts = alerts.data?.filter(
    (alert) => !["RESOLVED", "DISMISSED"].includes(alert.status),
  ).length;

  const metrics = [
    { value: brics.data?.nodes?.length ?? null, label: "Monitoring Regions" },
    { value: reports.data?.total ?? null, label: "Citizen Signals" },
    { value: hotspots.data?.length ?? null, label: "Detected Hotspots" },
    { value: activeAlerts ?? null, label: "Active Alerts" },
  ];

  return (
    <section className="section">
      <div className="container">
        <div className="section-header centered">
          <p className="eyebrow">
            <Gauge size={13} aria-hidden="true" />
            Platform Scale
          </p>
          <h2>What this platform is tracking right now.</h2>
        </div>

        <div className="impact-grid">
          {metrics.map((metric) => (
            <article className="impact-card" key={metric.label}>
              {loading ? (
                <Skeleton style={{ height: 42, width: "55%", margin: "0 auto 8px" }} />
              ) : (
                <p className="impact-value">
                  {metric.value === null ? (
                    <span style={{ color: "var(--muted)" }}>—</span>
                  ) : (
                    formatNumber(metric.value)
                  )}
                </p>
              )}
              <p className="impact-label">{metric.label}</p>
            </article>
          ))}
        </div>

        <p className="impact-note">
          {offline ? (
            <>
              <WifiOff size={15} aria-hidden="true" />
              The AtmosIQ API is unreachable, so no figures can be shown.
            </>
          ) : (
            <>
              <DataBadge mode="SIMULATED" />
              Live counts read from the AtmosIQ API. Records seeded for demonstration remain
              labelled SIMULATED in every response.
            </>
          )}
        </p>
      </div>
    </section>
  );
}
