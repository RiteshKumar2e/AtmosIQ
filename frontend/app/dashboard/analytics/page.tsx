"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, MapPinned, Radar, Users } from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  DataBadge,
  PageHeader,
  ResponsibleAiNotice,
  StatCard,
} from "@/components/dashboard/shared";
import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  Select,
  Skeleton,
} from "@/components/ui";
import { analyticsApi } from "@/lib/api";
import { formatNumber, titleCase } from "@/lib/utils";

/** Categorical palette: distinguishable, and consistent with the design system. */
const SOURCE_COLORS = [
  "#0f6f66",
  "#1c6394",
  "#a86a12",
  "#b3372c",
  "#5b4e9c",
  "#2f6f52",
  "#c1611c",
];

export default function AnalyticsPage() {
  const [granularity, setGranularity] = useState<"daily" | "weekly" | "monthly">("daily");

  const overview = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => analyticsApi.overview(),
  });

  const trends = useQuery({
    queryKey: ["analytics", "trends", granularity],
    queryFn: () => analyticsApi.trends({ granularity }),
  });

  const data = trends.data;

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Trends, source composition, participation and monitoring coverage across the region."
        badges={
          <>
            <DataBadge mode={data?.data_mode ?? "SIMULATED"} />
            <span className="text-muted" style={{ fontSize: "var(--text-xs)" }}>
              Aggregated from seeded demonstration history.
            </span>
          </>
        }
        actions={
          <Select
            value={granularity}
            onChange={(event) =>
              setGranularity(event.target.value as "daily" | "weekly" | "monthly")
            }
            aria-label="Trend granularity"
            style={{ width: 170 }}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </Select>
        }
      />

      {/* KPI row ----------------------------------------------------------- */}
      {overview.isLoading ? (
        <div className="kpi-grid">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="skeleton-card" />
          ))}
        </div>
      ) : overview.data?.kpis?.length ? (
        <div className="kpi-grid">
          {overview.data.kpis.slice(0, 4).map((kpi) => (
            <StatCard
              key={kpi.label}
              label={kpi.label}
              value={
                Number.isInteger(kpi.value) ? kpi.value : Number(kpi.value.toFixed(1))
              }
              suffix={kpi.unit ? ` ${kpi.unit}` : undefined}
              delta={kpi.delta_pct}
              hint={kpi.hint}
              dataMode={kpi.data_mode}
            />
          ))}
        </div>
      ) : null}

      {trends.isError ? (
        <Card>
          <ErrorState
            title="Could not load analytics"
            message={(trends.error as Error)?.message}
            onRetry={() => trends.refetch()}
          />
        </Card>
      ) : null}

      {/* Pollution trend ---------------------------------------------------- */}
      <Card className="dash-section-gap">
        <CardHeader
          title="Pollution trends"
          subtitle="Average PM2.5, PM10 and fused risk score over time."
          action={<DataBadge mode={data?.data_mode ?? "SIMULATED"} />}
        />
        <div className="chart-card-body is-tall">
          {trends.isLoading ? (
            <Skeleton style={{ height: "100%" }} />
          ) : !data?.trends?.length ? (
            <EmptyState title="No trend data available" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trends} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="pm25Fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f6f66" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#0f6f66" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b3372c" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#b3372c" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                />
                <YAxis
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "var(--muted)", paddingTop: 8 }}
                  iconType="circle"
                  iconSize={8}
                />
                <Area
                  type="monotone"
                  dataKey="avg_pm25"
                  name="PM2.5 (µg/m³)"
                  stroke="#0f6f66"
                  strokeWidth={2}
                  fill="url(#pm25Fill)"
                />
                <Area
                  type="monotone"
                  dataKey="avg_risk"
                  name="Risk score"
                  stroke="#b3372c"
                  strokeWidth={2}
                  fill="url(#riskFill)"
                />
                <Line
                  type="monotone"
                  dataKey="avg_pm10"
                  name="PM10 (µg/m³)"
                  stroke="#1c6394"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Sources + hotspot frequency ---------------------------------------- */}
      <div className="analytics-grid-2">
        <Card>
          <CardHeader
            title="Pollution sources"
            subtitle="Composition of detected events by source type."
            action={<DataBadge mode={data?.data_mode ?? "SIMULATED"} />}
          />
          <CardBody>
            {trends.isLoading ? (
              <Skeleton style={{ height: 260 }} />
            ) : !data?.sources?.length ? (
              <EmptyState title="No source breakdown available" />
            ) : (
              <>
                <div style={{ height: 220, marginBottom: 20 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.sources}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={54}
                        outerRadius={88}
                        paddingAngle={2}
                        stroke="var(--card)"
                        strokeWidth={2}
                      >
                        {data.sources.map((source, index) => (
                          <Cell
                            key={source.source}
                            fill={SOURCE_COLORS[index % SOURCE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="source-list">
                  {data.sources.map((source, index) => (
                    <div className="source-row" key={source.source}>
                      <div className="source-row-head">
                        <span className="source-name">
                          <span
                            className="source-swatch"
                            style={{
                              background: SOURCE_COLORS[index % SOURCE_COLORS.length],
                            }}
                            aria-hidden="true"
                          />
                          {source.label}
                        </span>
                        <span className="source-stats">
                          <span className="source-share">{source.share_pct.toFixed(1)}%</span>
                          <span className="source-count">{source.count} events</span>
                        </span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${source.share_pct}%`,
                            background: SOURCE_COLORS[index % SOURCE_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Hotspot frequency"
            subtitle="Detected hotspots and citizen reports per period."
            action={<DataBadge mode={data?.data_mode ?? "SIMULATED"} />}
          />
          <div className="chart-card-body is-tall">
            {trends.isLoading ? (
              <Skeleton style={{ height: "100%" }} />
            ) : !data?.trends?.length ? (
              <EmptyState title="No hotspot history available" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.trends} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: "var(--muted)", fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    tick={{ fill: "var(--muted)", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--background-alt)" }} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: "var(--muted)", paddingTop: 8 }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Bar dataKey="hotspots" name="Hotspots" fill="#b3372c" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="reports" name="Citizen reports" fill="#0f6f66" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Coverage + participation -------------------------------------------- */}
      <div className="analytics-grid-3">
        <Card>
          <CardHeader
            title="Monitoring coverage"
            subtitle="Share of the region covered by fixed stations versus citizen signals."
            action={<DataBadge mode={data?.data_mode ?? "SIMULATED"} />}
          />
          <CardBody style={{ paddingBottom: 0 }}>
            {data?.coverage_headline ? (
              <p className="coverage-headline">{data.coverage_headline}</p>
            ) : null}
          </CardBody>
          <div className="chart-card-body">
            {trends.isLoading ? (
              <Skeleton style={{ height: "100%" }} />
            ) : !data?.coverage?.length ? (
              <EmptyState title="No coverage data available" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.coverage} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "var(--muted)", fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    unit="%"
                    tick={{ fill: "var(--muted)", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTooltip suffix="%" />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: "var(--muted)", paddingTop: 8 }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Line
                    type="monotone"
                    dataKey="station_coverage_pct"
                    name="Fixed stations"
                    stroke="#1c6394"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="citizen_coverage_pct"
                    name="Citizen signals"
                    stroke="#0f6f66"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="combined_coverage_pct"
                    name="Combined"
                    stroke="#a86a12"
                    strokeWidth={2.4}
                    strokeDasharray="5 3"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Regional distribution"
            subtitle="How detected events distribute across deployed regions."
            action={<DataBadge mode={data?.data_mode ?? "SIMULATED"} />}
          />
          <CardBody>
            {trends.isLoading ? (
              <Skeleton style={{ height: 240 }} />
            ) : !data?.distribution?.length ? (
              <EmptyState title="No regional distribution available" />
            ) : (
              <div className="distribution-list">
                {data.distribution.map((region) => (
                  <div className="distribution-row" key={region.region_code}>
                    <span className="distribution-name">{region.name}</span>
                    <div className="distribution-metrics">
                      <div className="distribution-metric">
                        <p className="distribution-metric-value">{region.hotspots}</p>
                        <p className="distribution-metric-label">hotspots</p>
                      </div>
                      <div className="distribution-metric">
                        <p className="distribution-metric-value">
                          {Math.round(region.avg_risk)}
                        </p>
                        <p className="distribution-metric-label">avg risk</p>
                      </div>
                      <div className="distribution-metric">
                        <p className="distribution-metric-value">
                          {formatNumber(region.reports)}
                        </p>
                        <p className="distribution-metric-label">reports</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Citizen activity ---------------------------------------------------- */}
      <Card className="dash-section-gap">
        <CardHeader
          title="Citizen activity"
          subtitle="Observation volume submitted by residents over time."
          action={<DataBadge mode={data?.data_mode ?? "SIMULATED"} />}
        />
        <div className="chart-card-body">
          {trends.isLoading ? (
            <Skeleton style={{ height: "100%" }} />
          ) : !data?.participation?.length ? (
            <EmptyState title="No participation data available" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.participation}
                margin={{ top: 8, right: 12, left: -18, bottom: 0 }}
              >
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                />
                <YAxis
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--background-alt)" }} />
                <Bar dataKey="reports" name="Citizen reports" fill="#1c6394" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Insights ------------------------------------------------------------ */}
      <div className="insight-grid">
        <article className="insight-card">
          <span className="insight-icon" aria-hidden="true">
            <Radar size={17} />
          </span>
          <div>
            <p className="insight-title">Coverage is the differentiator</p>
            <p className="insight-text">
              Citizen signals extend effective monitoring reach well beyond the radius of the
              fixed station network.
            </p>
          </div>
        </article>

        <article className="insight-card">
          <span className="insight-icon" aria-hidden="true">
            <MapPinned size={17} />
          </span>
          <div>
            <p className="insight-title">Source composition guides enforcement</p>
            <p className="insight-text">
              Breaking hotspots down by source type directs inspection capacity by cause
              rather than by complaint volume.
            </p>
          </div>
        </article>

        <article className="insight-card">
          <span className="insight-icon" aria-hidden="true">
            <Users size={17} />
          </span>
          <div>
            <p className="insight-title">Participation compounds</p>
            <p className="insight-text">
              Each additional corroborating report raises confidence and reduces the chance of
              acting on a false signal.
            </p>
          </div>
        </article>
      </div>

      <ResponsibleAiNotice />
    </>
  );
}

/* -------------------------------------------------------------------------- */
function ChartTooltip({ active, payload, label, suffix = "" }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      {label ? <p className="chart-tooltip-label">{label}</p> : null}
      {payload.map((entry: any) => (
        <div className="chart-tooltip-row" key={entry.dataKey ?? entry.name}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              className="chart-legend-swatch"
              style={{ background: entry.color ?? entry.payload?.fill }}
              aria-hidden="true"
            />
            {entry.name}
          </span>
          <span className="chart-tooltip-value">
            {typeof entry.value === "number"
              ? Number.isInteger(entry.value)
                ? entry.value
                : entry.value.toFixed(1)
              : entry.value}
            {suffix}
          </span>
        </div>
      ))}
    </div>
  );
}
