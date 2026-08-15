"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Droplets,
  Flame,
  MessageSquareWarning,
  RefreshCw,
  Thermometer,
  Users,
  Wind,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DemoScenarioController } from "@/components/DemoScenarioController";
import { PollutionTrendChart } from "@/components/charts";
import {
  AiProviderBadge,
  ContributionList,
  DataStatusBadge,
  DemoDataBadge,
  KpiCard,
  RiskBadge,
  WindIndicator,
} from "@/components/indicators";
import { PageBody, PageHeader } from "@/components/layout/AppShell";
import { HotspotMap, MapLegend } from "@/components/map/HotspotMap";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardSkeleton,
  EmptyState,
  ErrorState,
  Skeleton,
} from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { aqiTone, cn, eventLabel, formatNumber, timeAgo } from "@/lib/utils";

export default function DashboardPage() {
  const [selectedHotspot, setSelectedHotspot] = useState<number | null>(null);

  const overview = useQuery({ queryKey: ["overview"], queryFn: () => api.overview() });
  const mapLayers = useQuery({ queryKey: ["map-layers"], queryFn: () => api.mapLayers() });
  const trends = useQuery({
    queryKey: ["trends", "daily"],
    queryFn: () => api.trends({ granularity: "daily" }),
  });

  const kpiIcons = [Flame, Flame, Users, AlertTriangle];

  return (
    <>
      <PageHeader
        title="Operational overview"
        description="Current environmental risk state, active hotspots, and the live detection pipeline for the selected region."
        badges={
          <>
            {overview.data && (
              <Badge tone="neutral" size="md">
                {overview.data.region_name} · {overview.data.region_code}
              </Badge>
            )}
            {overview.data && <AiProviderBadge provider={overview.data.ai_provider} />}
          </>
        }
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void overview.refetch();
                void mapLayers.refetch();
                void trends.refetch();
              }}
              loading={overview.isRefetching || mapLayers.isRefetching}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Refresh
            </Button>
            <Link href="/reports/new">
              <Button size="sm">
                <MessageSquareWarning className="h-3.5 w-3.5" aria-hidden />
                Report event
              </Button>
            </Link>
          </>
        }
      />

      <PageBody className="space-y-5">
        {/* ------------------------------------------------------------ KPIs */}
        {overview.isLoading && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <CardSkeleton key={index} rows={2} />
            ))}
          </div>
        )}

        {overview.isError && (
          <ErrorState
            title="Could not load the operational overview"
            message={(overview.error as Error)?.message}
            onRetry={() => void overview.refetch()}
          />
        )}

        {overview.data && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {overview.data.kpis.map((kpi, index) => {
              const Icon = kpiIcons[index] ?? Flame;
              return (
                <KpiCard
                  key={kpi.label}
                  label={kpi.label}
                  value={kpi.value}
                  unit={kpi.unit}
                  delta={kpi.delta_pct}
                  level={kpi.level}
                  mode={kpi.data_mode}
                  hint={kpi.hint}
                  icon={<Icon className="h-3.5 w-3.5" aria-hidden />}
                  invertDelta={kpi.label.includes("Citizen")}
                />
              );
            })}
          </div>
        )}

        {/* ------------------------------------------------ map + conditions */}
        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <Card className="overflow-hidden">
            <CardHeader
              title="Live pollution intelligence map"
              description="Hotspots, citizen signals, reference stations, and modelled downwind corridors."
              action={
                <Link href="/hotspots">
                  <Button variant="ghost" size="sm">
                    Full map
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </Link>
              }
            />
            <div className="p-3">
              {mapLayers.isLoading && <Skeleton className="h-[420px] w-full rounded-md" />}

              {mapLayers.isError && (
                <ErrorState
                  message={(mapLayers.error as Error)?.message}
                  onRetry={() => void mapLayers.refetch()}
                />
              )}

              {mapLayers.data && (
                <>
                  <HotspotMap
                    hotspots={mapLayers.data.hotspots}
                    reports={mapLayers.data.reports}
                    stations={mapLayers.data.stations}
                    corridors={mapLayers.data.corridors}
                    wind={mapLayers.data.wind}
                    selectedHotspotId={selectedHotspot}
                    onSelectHotspot={(hotspot) => setSelectedHotspot(hotspot.id)}
                    className="h-[420px] w-full"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-line)] pt-3">
                    <MapLegend />
                    <span className="text-[10px] text-[var(--color-ink-subtle)]">
                      Updated {timeAgo(mapLayers.data.generated_at)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* --------------------------------------------- current conditions */}
          <div className="space-y-4">
            <Card>
              <CardHeader title="Current conditions" />
              <CardBody className="space-y-3">
                {overview.isLoading && <Skeleton className="h-32 w-full" />}
                {overview.data && (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
                          Air quality index
                        </p>
                        <div className="mt-0.5 flex items-baseline gap-2">
                          <span
                            className={cn(
                              "text-3xl font-semibold tabular",
                              aqiTone(overview.data.air_quality.aqi).className,
                            )}
                          >
                            {overview.data.air_quality.aqi}
                          </span>
                          <span className="text-xs text-[var(--color-ink-muted)]">
                            {overview.data.air_quality.aqi_category}
                          </span>
                        </div>
                      </div>
                      <DataStatusBadge mode={overview.data.air_quality.data_mode} />
                    </div>

                    <dl className="grid grid-cols-2 gap-2">
                      <Reading
                        label="PM2.5"
                        value={`${formatNumber(overview.data.air_quality.pm25, 1)}`}
                        unit="µg/m³"
                        emphasis
                      />
                      <Reading
                        label="PM10"
                        value={`${formatNumber(overview.data.air_quality.pm10, 1)}`}
                        unit="µg/m³"
                      />
                      <Reading
                        label="Temperature"
                        value={`${formatNumber(overview.data.air_quality.temperature, 1)}`}
                        unit="°C"
                        icon={<Thermometer className="h-3 w-3" aria-hidden />}
                      />
                      <Reading
                        label="Humidity"
                        value={`${formatNumber(overview.data.air_quality.humidity, 0)}`}
                        unit="%"
                        icon={<Droplets className="h-3 w-3" aria-hidden />}
                      />
                    </dl>

                    <p className="rounded border border-[var(--color-line)] bg-[var(--color-surface-sunken)] px-2.5 py-1.5 text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
                      PM2.5 is{" "}
                      <span className="font-semibold text-[var(--color-ink)]">
                        {overview.data.air_quality.who_exceedance}×
                      </span>{" "}
                      the WHO 24-hour guideline of 15 µg/m³.
                    </p>

                    <div className="border-t border-[var(--color-line)] pt-3">
                      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
                        <Wind className="h-3 w-3" aria-hidden />
                        Dispersion conditions
                      </p>
                      <WindIndicator
                        speedMs={overview.data.wind.speed_ms}
                        directionDeg={overview.data.wind.direction_deg}
                        compass={overview.data.wind.direction_compass}
                        dispersionIndex={overview.data.wind.dispersion_index}
                        description={overview.data.wind.description}
                        mode={overview.data.wind.data_mode}
                      />
                    </div>
                  </>
                )}
              </CardBody>
            </Card>

            {/* ------------------------------------------------ explainability */}
            <Card>
              <CardHeader
                title="Why is this area at risk?"
                description="Each factor's share of the realised risk score."
              />
              <CardBody>
                {overview.isLoading && <Skeleton className="h-40 w-full" />}
                {overview.data && (
                  <>
                    <ContributionList
                      contributions={overview.data.explainability}
                      limit={5}
                      showDetail={false}
                    />
                    <div className="mt-3 border-t border-[var(--color-line)] pt-3">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
                        AI reasoning summary
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
                        {overview.data.reasoning_summary}
                      </p>
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </div>
        </div>

        {/* ------------------------------------------------- demo scenario */}
        <DemoScenarioController
          onComplete={(result) => setSelectedHotspot(result.hotspot.id)}
        />

        {/* --------------------------------------- hotspots + alerts + trend */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Highest-risk hotspots"
              action={
                <Link href="/hotspots">
                  <Button variant="ghost" size="sm">
                    View all
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </Link>
              }
            />
            <CardBody className="p-0">
              {overview.isLoading && <div className="p-4"><Skeleton className="h-32 w-full" /></div>}

              {overview.data && overview.data.top_hotspots.length === 0 && (
                <EmptyState
                  icon={<Flame className="h-4 w-4" />}
                  title="No active hotspots"
                  description="The risk engine has not registered any hotspots in this region. Submit a report or run the live scenario."
                />
              )}

              {overview.data && overview.data.top_hotspots.length > 0 && (
                <ul className="divide-y divide-[var(--color-line)]">
                  {overview.data.top_hotspots.map((hotspot) => (
                    <li key={hotspot.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedHotspot(hotspot.id)}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-sunken)]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-xs font-semibold text-[var(--color-ink)]">
                              {hotspot.location_label}
                            </span>
                            <RiskBadge level={hotspot.risk_level} size="sm" />
                          </div>
                          <p className="mt-0.5 text-[11px] text-[var(--color-ink-muted)]">
                            {eventLabel(hotspot.pollution_type)} ·{" "}
                            {formatNumber(hotspot.population_exposed)} exposed ·{" "}
                            {timeAgo(hotspot.detected_at)}
                          </p>
                        </div>
                        <span className="shrink-0 text-lg font-semibold tabular text-[var(--color-ink)]">
                          {Math.round(hotspot.risk_score)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Recent alerts"
              action={
                <Link href="/alerts">
                  <Button variant="ghost" size="sm">
                    Alert centre
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </Link>
              }
            />
            <CardBody className="p-0">
              {overview.isLoading && <div className="p-4"><Skeleton className="h-32 w-full" /></div>}

              {overview.data && overview.data.recent_alerts.length === 0 && (
                <EmptyState
                  icon={<AlertTriangle className="h-4 w-4" />}
                  title="No open alerts"
                  description="Nothing currently requires authority attention in this region."
                />
              )}

              {overview.data && overview.data.recent_alerts.length > 0 && (
                <ul className="divide-y divide-[var(--color-line)]">
                  {overview.data.recent_alerts.map((alert) => (
                    <li key={alert.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <RiskBadge level={alert.severity} size="sm" />
                        <span className="text-[10px] text-[var(--color-ink-subtle)]">
                          {timeAgo(alert.created_at)}
                        </span>
                        <Badge tone="neutral" size="sm" className="ml-auto">
                          {alert.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs font-semibold leading-snug text-[var(--color-ink)]">
                        {alert.location_label}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
                        {alert.recommended_action}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        {/* ----------------------------------------------------- trend chart */}
        <Card>
          <CardHeader
            title="30-day pollution trend"
            description="Regional daily averages from the historical series."
            action={<DemoDataBadge />}
          />
          <CardBody>
            {trends.isLoading && <Skeleton className="h-56 w-full" />}
            {trends.isError && (
              <ErrorState
                message={(trends.error as Error)?.message}
                onRetry={() => void trends.refetch()}
              />
            )}
            {trends.data && trends.data.trends.length > 0 && (
              <PollutionTrendChart data={trends.data.trends} height={240} />
            )}
            {trends.data && trends.data.trends.length === 0 && (
              <EmptyState
                title="No historical data yet"
                description="Run the seed script to populate the demonstration history."
              />
            )}
          </CardBody>
        </Card>
      </PageBody>
    </>
  );
}

function Reading({
  label,
  value,
  unit,
  icon,
  emphasis,
}: {
  label: string;
  value: string;
  unit: string;
  icon?: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded border border-[var(--color-line)] bg-[var(--color-surface-sunken)] px-2.5 py-1.5">
      <dt className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
        {icon}
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 tabular",
          emphasis
            ? "text-base font-semibold text-[var(--color-ink)]"
            : "text-sm font-medium text-[var(--color-ink)]",
        )}
      >
        {value}
        <span className="ml-0.5 text-[10px] font-normal text-[var(--color-ink-subtle)]">
          {unit}
        </span>
      </dd>
    </div>
  );
}
