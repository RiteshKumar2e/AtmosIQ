"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BellRing,
  Gauge,
  MapPinned,
  Users,
  Wind as WindIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { DemoSimulation } from "@/components/dashboard/DemoSimulation";
import {
  DataBadge,
  DetailList,
  PageHeader,
  ResponsibleAiNotice,
  RiskBadge,
  StatCard,
} from "@/components/dashboard/shared";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  Skeleton,
} from "@/components/ui";
import { useRegion } from "@/hooks/useRegion";
import { alertsApi, analyticsApi, hotspotsApi } from "@/lib/api";
import {
  formatNumber,
  riskColor,
  riskKey,
  timeAgo,
  titleCase,
} from "@/lib/utils";

// The map pulls in MapLibre and touches `window`, so it must stay client-only.
const PollutionMap = dynamic(
  () => import("@/components/map/PollutionMap").then((mod) => mod.PollutionMap),
  {
    ssr: false,
    loading: () => <Skeleton style={{ height: 560, borderRadius: "var(--radius-lg)" }} />,
  },
);

export default function DashboardOverviewPage() {
  const { regionCode } = useRegion();

  const overview = useQuery({
    queryKey: ["analytics", "overview", regionCode],
    queryFn: () => analyticsApi.overview(regionCode),
    enabled: Boolean(regionCode),
  });

  const layers = useQuery({
    queryKey: ["hotspots", "map", regionCode],
    queryFn: () => hotspotsApi.map(regionCode),
    enabled: Boolean(regionCode),
  });

  const alerts = useQuery({
    queryKey: ["alerts", "recent", regionCode],
    queryFn: () => alertsApi.list({ limit: 6, region_code: regionCode }),
    enabled: Boolean(regionCode),
  });

  const data = overview.data;
  const risk = data?.current_risk ?? 0;

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={
          data
            ? `Operational picture for ${data.region_name}, generated ${timeAgo(data.generated_at)}.`
            : "Operational picture for the active monitoring region."
        }
        badges={
          data ? (
            <>
              <RiskBadge level={data.current_risk_level} />
              <DataBadge mode="MODELLED" />
              <span className="text-muted" style={{ fontSize: "var(--text-xs)" }}>
                AI provider: {data.ai_provider}
              </span>
            </>
          ) : null
        }
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/dashboard/hotspots">
                View hotspots
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </Button>
            <DemoSimulation />
          </>
        }
      />

      {/* KPIs -------------------------------------------------------------- */}
      {overview.isLoading ? (
        <div className="kpi-grid">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="skeleton-card" />
          ))}
        </div>
      ) : overview.isError ? (
        <Card>
          <ErrorState
            title="Could not load the regional overview"
            message={(overview.error as Error)?.message}
            onRetry={() => overview.refetch()}
          />
        </Card>
      ) : data ? (
        <div className="kpi-grid">
          <StatCard
            label="Current Air Risk"
            value={Math.round(risk)}
            suffix=" / 100"
            icon={Gauge}
            accent={riskColor(data.current_risk_level)}
            accentSoft={`${riskColor(data.current_risk_level)}1a`}
            hint={`${data.current_risk_level} band`}
            dataMode="MODELLED"
          />
          <StatCard
            label="Active Hotspots"
            value={data.active_hotspots}
            icon={MapPinned}
            accent="var(--warning)"
            accentSoft="var(--warning-soft)"
            hint="Currently under watch"
            dataMode="MODELLED"
          />
          <StatCard
            label="Citizen Signals"
            value={data.citizen_signals_24h}
            icon={Users}
            accent="var(--information)"
            accentSoft="var(--information-soft)"
            hint="Last 24 hours"
            dataMode="SIMULATED"
          />
          <StatCard
            label="Critical Alerts"
            value={data.critical_alerts}
            icon={BellRing}
            accent="var(--danger)"
            accentSoft="var(--danger-soft)"
            hint="Awaiting action"
            dataMode="MODELLED"
          />
        </div>
      ) : null}

      {/* Map --------------------------------------------------------------- */}
      <Card className="dash-section-gap">
        <CardHeader
          title="Live Pollution Intelligence Map"
          subtitle="Detected hotspots, citizen reports and fixed monitoring stations on one view."
          action={<DataBadge mode="MODELLED" />}
        />
        {layers.isError ? (
          <ErrorState
            title="Map data unavailable"
            message={(layers.error as Error)?.message}
            onRetry={() => layers.refetch()}
          />
        ) : (
          <div style={{ padding: 16 }}>
            <PollutionMap
              hotspots={layers.data?.hotspots ?? []}
              reports={layers.data?.reports ?? []}
              stations={layers.data?.stations ?? []}
              wind={layers.data?.wind}
            />
          </div>
        )}
      </Card>

      {/* Detail row -------------------------------------------------------- */}
      <div className="dash-overview-grid">
        <Card>
          <CardHeader
            title="Highest-risk hotspots"
            subtitle="Ranked by fused risk score across the active region."
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/hotspots">View all</Link>
              </Button>
            }
          />
          <CardBody style={{ paddingTop: 8 }}>
            {overview.isLoading ? (
              <>
                <Skeleton className="skeleton-text" />
                <Skeleton className="skeleton-text" />
                <Skeleton className="skeleton-text" />
              </>
            ) : !data?.top_hotspots?.length ? (
              <EmptyState
                title="No active hotspots"
                message="No location currently clears the detection threshold in this region."
              />
            ) : (
              data.top_hotspots.slice(0, 6).map((hotspot, index) => (
                <div className="intel-hotspot-row" key={hotspot.id}>
                  <span className="intel-hotspot-rank">{index + 1}</span>
                  <div className="intel-hotspot-body">
                    <p className="intel-hotspot-name">{hotspot.location_label}</p>
                    <p className="intel-hotspot-meta">
                      {titleCase(hotspot.likely_source)} · {hotspot.signal_count} signals ·{" "}
                      {timeAgo(hotspot.detected_at)}
                    </p>
                  </div>
                  <span className={`hotspot-score is-${riskKey(hotspot.risk_level)}`}>
                    {Math.round(hotspot.risk_score)}
                  </span>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <div className="stack" style={{ gap: 20 }}>
          <Card>
            <CardHeader
              title="Dispersion conditions"
              subtitle="Meteorology driving how quickly pollutants clear."
              action={data?.wind ? <DataBadge mode={data.wind.data_mode} /> : null}
            />
            <CardBody>
              {data?.wind ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      marginBottom: 16,
                    }}
                  >
                    <span
                      className="stat-icon"
                      style={{
                        width: 44,
                        height: 44,
                        background: "var(--information-soft)",
                        color: "var(--information)",
                      }}
                      aria-hidden="true"
                    >
                      <WindIcon size={20} />
                    </span>
                    <div>
                      <p style={{ fontSize: "var(--text-2xl)", fontWeight: 700, lineHeight: 1.1 }}>
                        {data.wind.speed_ms.toFixed(1)}
                        <small style={{ fontSize: "var(--text-md)", color: "var(--muted)" }}>
                          {" "}
                          m/s
                        </small>
                      </p>
                      <p className="text-muted" style={{ fontSize: "var(--text-sm)" }}>
                        From {data.wind.direction_compass} · {data.wind.description}
                      </p>
                    </div>
                  </div>

                  <DetailList
                    items={[
                      { label: "Gusting to", value: `${data.wind.gust_ms.toFixed(1)} m/s` },
                      {
                        label: "Dispersion index",
                        value: data.wind.dispersion_index.toFixed(2),
                      },
                      {
                        label: "Bearing",
                        value: `${Math.round(data.wind.direction_deg)}°`,
                      },
                    ]}
                  />
                </>
              ) : (
                <Skeleton style={{ height: 140 }} />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Recent alerts"
              subtitle="Most recent early warnings raised for this region."
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/alerts">Open queue</Link>
                </Button>
              }
            />
            <CardBody style={{ paddingTop: 8 }}>
              {alerts.isLoading ? (
                <Skeleton style={{ height: 120 }} />
              ) : !alerts.data?.length ? (
                <EmptyState
                  title="No alerts raised"
                  message="Nothing has crossed the alerting threshold recently."
                />
              ) : (
                alerts.data.slice(0, 5).map((alert) => (
                  <div className="intel-hotspot-row" key={alert.id}>
                    <span
                      className="intel-hotspot-rank"
                      style={{
                        background: `${riskColor(alert.severity)}1a`,
                        color: riskColor(alert.severity),
                      }}
                    >
                      {Math.round(alert.risk_score)}
                    </span>
                    <div className="intel-hotspot-body">
                      <p className="intel-hotspot-name">{alert.title}</p>
                      <p className="intel-hotspot-meta">
                        {alert.location_label} · {timeAgo(alert.created_at)}
                      </p>
                    </div>
                    <span className={`alert-status is-${alert.status.toLowerCase()}`}>
                      {titleCase(alert.status)}
                    </span>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Reasoning --------------------------------------------------------- */}
      {data?.reasoning_summary ? (
        <Card className="dash-section-gap">
          <CardHeader
            title="Why is this region at risk?"
            subtitle="Generated explanation of the current regional score."
            action={<DataBadge mode="MODELLED" />}
          />
          <CardBody>
            <p style={{ fontSize: "var(--text-base)", lineHeight: 1.75, marginBottom: 18 }}>
              {data.reasoning_summary}
            </p>
            <p className="text-muted" style={{ fontSize: "var(--text-sm)" }}>
              {formatNumber(data.explainability.length)} weighted factors contributed to this
              assessment. See{" "}
              <Link href="/dashboard/intelligence" className="auth-link">
                Pollution Intelligence
              </Link>{" "}
              for the full breakdown.
            </p>
          </CardBody>
        </Card>
      ) : null}

      <ResponsibleAiNotice />
    </>
  );
}
