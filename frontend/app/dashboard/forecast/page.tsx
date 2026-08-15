"use client";

import { useQuery } from "@tanstack/react-query";
import { Info, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  DataBadge,
  FactorList,
  PageHeader,
  ResponsibleAiNotice,
  RiskBadge,
} from "@/components/dashboard/shared";
import {
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  Select,
  Skeleton,
} from "@/components/ui";
import { useRegion } from "@/hooks/useRegion";
import { forecastApi } from "@/lib/api";
import { cn, riskColor, riskLevelFromScore, timeAgo } from "@/lib/utils";

export default function ForecastPage() {
  const [horizon, setHorizon] = useState(6);

  const { regionCode } = useRegion();

  const forecast = useQuery({
    queryKey: ["forecast", horizon, regionCode],
    queryFn: () => forecastApi.get({ horizon_hours: horizon, region_code: regionCode }),
    enabled: Boolean(regionCode),
  });

  const data = forecast.data;

  // Recharts renders a stacked band as [lower, band-height].
  const chartData =
    data?.points.map((point) => ({
      label: point.hour_label,
      risk: point.risk_score,
      lower: point.lower_bound,
      bandHeight: Math.max(0, point.upper_bound - point.lower_bound),
      upper: point.upper_bound,
      pm25: point.pm25_estimate,
      confidence: point.confidence,
    })) ?? [];

  const trend = (data?.trend ?? "steady").toLowerCase();
  const TrendIcon = trend.includes("ris")
    ? TrendingUp
    : trend.includes("fall") || trend.includes("declin")
      ? TrendingDown
      : Minus;

  return (
    <>
      <PageHeader
        title="Pollution Forecast"
        subtitle={
          data
            ? `Projection for ${data.region_code}, generated ${timeAgo(data.generated_at)}.`
            : "Near-term pollution risk projection for the active region."
        }
        badges={
          data ? (
            <>
              <DataBadge mode={data.data_mode} />
              <span className="badge badge-neutral">{data.model_name}</span>
            </>
          ) : null
        }
        actions={
          <Select
            value={String(horizon)}
            onChange={(event) => setHorizon(Number(event.target.value))}
            aria-label="Forecast horizon"
            style={{ width: 190 }}
          >
            <option value="6">6-hour horizon</option>
            <option value="12">12-hour horizon</option>
            <option value="24">24-hour horizon</option>
          </Select>
        }
      />

      {forecast.isError ? (
        <Card>
          <ErrorState
            title="Could not load the forecast"
            message={(forecast.error as Error)?.message}
            onRetry={() => forecast.refetch()}
          />
        </Card>
      ) : null}

      <div className="forecast-grid">
        {/* Chart ----------------------------------------------------------- */}
        <Card>
          <CardHeader
            title={`${horizon}-Hour Risk Forecast`}
            subtitle="Projected risk with an explicit confidence band that widens with lead time."
            action={
              <span className="confidence-key">
                <span className="confidence-key-band" aria-hidden="true" />
                Confidence range
              </span>
            }
          />

          {data ? (
            <div className="forecast-headline">
              <div className="forecast-headline-item">
                <p className="forecast-headline-label">Current risk</p>
                <p
                  className="forecast-headline-value"
                  style={{ color: riskColor(riskLevelFromScore(data.current_risk)) }}
                >
                  {Math.round(data.current_risk)}
                </p>
                <p className="forecast-headline-meta">out of 100</p>
              </div>

              <div className="forecast-headline-item">
                <p className="forecast-headline-label">Projected peak</p>
                <p
                  className="forecast-headline-value"
                  style={{ color: riskColor(riskLevelFromScore(data.peak_risk)) }}
                >
                  {Math.round(data.peak_risk)}
                </p>
                <p className="forecast-headline-meta">at {data.peak_at}</p>
              </div>

              <div className="forecast-headline-item">
                <p className="forecast-headline-label">Direction</p>
                <p
                  className={cn(
                    "forecast-trend",
                    trend.includes("ris")
                      ? "is-rising"
                      : trend.includes("fall") || trend.includes("declin")
                        ? "is-falling"
                        : "is-steady",
                  )}
                  style={{ fontSize: "var(--text-lg)" }}
                >
                  <TrendIcon size={18} aria-hidden="true" />
                  {data.trend}
                </p>
              </div>

              <div className="forecast-headline-item">
                <p className="forecast-headline-label">Peak band</p>
                <div style={{ marginTop: 4 }}>
                  <RiskBadge level={riskLevelFromScore(data.peak_risk)} />
                </div>
              </div>
            </div>
          ) : null}

          <div className="chart-card-body is-tall">
            {forecast.isLoading ? (
              <Skeleton style={{ height: "100%" }} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "var(--muted)", fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "var(--muted)", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ForecastTooltip />} />

                  {/* Lower bound is transparent; the visible band sits on top. */}
                  <Area
                    dataKey="lower"
                    stackId="band"
                    stroke="none"
                    fill="transparent"
                    isAnimationActive={false}
                  />
                  <Area
                    dataKey="bandHeight"
                    stackId="band"
                    stroke="none"
                    fill="var(--primary)"
                    fillOpacity={0.14}
                    isAnimationActive={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="risk"
                    stroke="var(--primary)"
                    strokeWidth={2.4}
                    dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Contributing factors -------------------------------------------- */}
        <Card>
          <CardHeader
            title="Contributing factors"
            subtitle="What is driving the projection above."
            action={<DataBadge mode="MODELLED" />}
          />
          <CardBody>
            {forecast.isLoading ? (
              <Skeleton style={{ height: 240 }} />
            ) : (
              <FactorList factors={data?.contributing_factors ?? []} />
            )}
          </CardBody>
        </Card>
      </div>

      {/* Hour-by-hour ------------------------------------------------------- */}
      <Card className="dash-section-gap">
        <CardHeader
          title="Hour by hour"
          subtitle="Projected risk and confidence range for each hour of the horizon."
          action={<DataBadge mode="MODELLED" />}
        />
        <CardBody>
          {forecast.isLoading ? (
            <Skeleton style={{ height: 140 }} />
          ) : (
            <div className="forecast-hours">
              {data?.points.map((point) => {
                const level = riskLevelFromScore(point.risk_score);
                return (
                  <div className="forecast-hour" key={point.timestamp}>
                    <p className="forecast-hour-time">{point.hour_label}</p>
                    <p className="forecast-hour-value" style={{ color: riskColor(level) }}>
                      {Math.round(point.risk_score)}
                    </p>
                    <div
                      className="forecast-hour-bar"
                      style={{ background: riskColor(level) }}
                    />
                    <p className="forecast-hour-band">
                      {Math.round(point.lower_bound)}–{Math.round(point.upper_bound)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Method ------------------------------------------------------------- */}
      {data ? (
        <Card className="dash-section-gap">
          <CardHeader title="Model disclosure" action={<DataBadge mode={data.data_mode} />} />
          <CardBody>
            <div className="forecast-method">
              <p className="forecast-method-title">
                <Info size={15} aria-hidden="true" />
                {data.model_name}
              </p>
              <p>{data.model_note}</p>
              {data.ai_summary ? (
                <p style={{ marginTop: 12 }}>{data.ai_summary}</p>
              ) : null}
            </div>
          </CardBody>
        </Card>
      ) : null}

      <ResponsibleAiNotice />
    </>
  );
}

/* -------------------------------------------------------------------------- */
function ForecastTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      <div className="chart-tooltip-row">
        <span>Projected risk</span>
        <span className="chart-tooltip-value">{Math.round(point.risk)}</span>
      </div>
      <div className="chart-tooltip-row">
        <span>Range</span>
        <span className="chart-tooltip-value">
          {Math.round(point.lower)}–{Math.round(point.upper)}
        </span>
      </div>
      <div className="chart-tooltip-row">
        <span>PM2.5 estimate</span>
        <span className="chart-tooltip-value">{Math.round(point.pm25)} µg/m³</span>
      </div>
      <div className="chart-tooltip-row">
        <span>Confidence</span>
        <span className="chart-tooltip-value">{Math.round(point.confidence * 100)}%</span>
      </div>
    </div>
  );
}
