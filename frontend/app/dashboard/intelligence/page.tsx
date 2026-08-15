"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BrainCircuit,
  Droplets,
  Factory,
  Gauge,
  Thermometer,
  Wind as WindIcon,
} from "lucide-react";

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
  EmptyState,
  ErrorState,
  Skeleton,
} from "@/components/ui";
import { analyticsApi, forecastApi } from "@/lib/api";
import { formatNumber, riskColor, timeAgo, titleCase } from "@/lib/utils";

/** WHO 2021 24-hour guideline values, used as the comparison reference. */
const GUIDELINES: Record<string, { label: string; unit: string; guideline: number }> = {
  pm25: { label: "PM2.5", unit: "µg/m³", guideline: 15 },
  pm10: { label: "PM10", unit: "µg/m³", guideline: 45 },
  no2: { label: "NO₂", unit: "µg/m³", guideline: 25 },
  so2: { label: "SO₂", unit: "µg/m³", guideline: 40 },
  o3: { label: "O₃", unit: "µg/m³", guideline: 100 },
  co: { label: "CO", unit: "mg/m³", guideline: 4 },
};

function pollutantLevel(value: number, guideline: number): string {
  const ratio = value / guideline;
  if (ratio >= 5) return "CRITICAL";
  if (ratio >= 3) return "HIGH";
  if (ratio >= 1.5) return "MODERATE";
  return "LOW";
}

export default function IntelligencePage() {
  const overview = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => analyticsApi.overview(),
  });

  const forecast = useQuery({
    queryKey: ["forecast", 6],
    queryFn: () => forecastApi.get({ horizon_hours: 6 }),
  });

  const data = overview.data;
  const air = data?.air_quality ?? {};

  const pollutants = Object.entries(GUIDELINES)
    .map(([key, meta]) => {
      const raw = air[key];
      const value = typeof raw === "number" ? raw : null;
      return value === null ? null : { key, ...meta, value };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <>
      <PageHeader
        title="Pollution Intelligence"
        subtitle={
          data
            ? `Fused environmental assessment for ${data.region_name}, generated ${timeAgo(data.generated_at)}.`
            : "Fused environmental assessment for the active monitoring region."
        }
        badges={
          data ? (
            <>
              <RiskBadge level={data.current_risk_level} />
              <DataBadge mode="MODELLED" />
              <DataBadge mode="AI ASSESSMENT" />
            </>
          ) : null
        }
      />

      {overview.isError ? (
        <Card>
          <ErrorState
            title="Could not load intelligence"
            message={(overview.error as Error)?.message}
            onRetry={() => overview.refetch()}
          />
        </Card>
      ) : null}

      <div className="intelligence-grid">
        {/* Risk gauge ----------------------------------------------------- */}
        <Card>
          <CardHeader
            title="Current risk"
            subtitle="Fused 0-100 score across all evidence streams."
            action={<DataBadge mode="MODELLED" />}
          />
          {overview.isLoading || !data ? (
            <CardBody>
              <Skeleton style={{ height: 260 }} />
            </CardBody>
          ) : (
            <div className="risk-gauge">
              <RiskGauge score={data.current_risk} level={data.current_risk_level} />
              <div className="risk-gauge-meta">
                <RiskBadge level={data.current_risk_level} />
                <span className="badge badge-neutral">
                  {formatNumber(data.active_hotspots)} active hotspots
                </span>
              </div>

              <div className="source-callout" style={{ marginTop: 22, width: "100%" }}>
                <span className="source-callout-icon" aria-hidden="true">
                  <Factory size={20} />
                </span>
                <div>
                  <p className="source-callout-label">Most likely dominant source</p>
                  <p className="source-callout-value">
                    {titleCase(
                      data.top_hotspots[0]?.likely_source ?? "Mixed local sources",
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Pollutant indicators -------------------------------------------- */}
        <Card>
          <CardHeader
            title="Pollutant indicators"
            subtitle="Measured concentrations against WHO 2021 24-hour guidelines."
            action={
              <DataBadge mode={(air.data_mode as string) ?? "SIMULATED"} />
            }
          />
          <CardBody>
            {overview.isLoading ? (
              <Skeleton style={{ height: 220 }} />
            ) : !pollutants.length ? (
              <EmptyState
                title="No pollutant readings"
                message="No reference station data is available for this region right now."
              />
            ) : (
              <div className="pollutant-grid">
                {pollutants.map((pollutant) => {
                  const level = pollutantLevel(pollutant.value, pollutant.guideline);
                  const ratio = pollutant.value / pollutant.guideline;
                  return (
                    <div className="pollutant-card" key={pollutant.key}>
                      <div className="pollutant-head">
                        <span className="pollutant-name">{pollutant.label}</span>
                        <span className="pollutant-unit">{pollutant.unit}</span>
                      </div>
                      <p
                        className="pollutant-value"
                        style={{ color: riskColor(level) }}
                      >
                        {pollutant.value.toFixed(1)}
                      </p>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.min(100, (ratio / 5) * 100)}%`,
                            background: riskColor(level),
                          }}
                        />
                      </div>
                      <div className="pollutant-guideline">
                        <span>Guideline {pollutant.guideline}</span>
                        <span style={{ fontWeight: 650, color: riskColor(level) }}>
                          {ratio.toFixed(1)}×
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Environmental signals ---------------------------------------------- */}
      <Card className="dash-section-gap">
        <CardHeader
          title="Environmental signals"
          subtitle="Contextual conditions that determine how pollutants accumulate or clear."
          action={data?.wind ? <DataBadge mode={data.wind.data_mode} /> : null}
        />
        <CardBody>
          {overview.isLoading || !data ? (
            <Skeleton style={{ height: 180 }} />
          ) : (
            <div className="signal-list">
              <SignalRow
                icon={<WindIcon size={17} />}
                label="Wind speed and direction"
                detail={data.wind.description}
                value={`${data.wind.speed_ms.toFixed(1)} m/s ${data.wind.direction_compass}`}
              />
              <SignalRow
                icon={<Activity size={17} />}
                label="Dispersion index"
                detail="Higher values indicate the airshed clears faster."
                value={data.wind.dispersion_index.toFixed(2)}
              />
              {typeof air.temperature === "number" ? (
                <SignalRow
                  icon={<Thermometer size={17} />}
                  label="Temperature"
                  detail="Cool air favours a shallow inversion layer near the surface."
                  value={`${air.temperature.toFixed(1)} °C`}
                />
              ) : null}
              {typeof air.humidity === "number" ? (
                <SignalRow
                  icon={<Droplets size={17} />}
                  label="Relative humidity"
                  detail="High humidity promotes secondary aerosol formation."
                  value={`${Math.round(air.humidity)}%`}
                />
              ) : null}
              <SignalRow
                icon={<Gauge size={17} />}
                label="Citizen signal volume"
                detail="Independent observations corroborating the current assessment."
                value={`${formatNumber(data.citizen_signals_24h)} / 24h`}
              />
            </div>
          )}
        </CardBody>
      </Card>

      {/* AI assessment ------------------------------------------------------ */}
      <Card className="dash-section-gap">
        <CardHeader
          title="AI assessment"
          subtitle="Generated interpretation of the current regional picture."
          action={<DataBadge mode="AI ASSESSMENT" />}
        />
        <CardBody>
          {overview.isLoading || !data ? (
            <Skeleton style={{ height: 140 }} />
          ) : (
            <div className="ai-assessment">
              <div className="ai-assessment-head">
                <span className="ai-assessment-icon" aria-hidden="true">
                  <BrainCircuit size={18} />
                </span>
                <span className="ai-assessment-title">Regional assessment</span>
                <span className="badge badge-primary">{data.ai_provider}</span>
              </div>

              <p className="ai-assessment-text">
                {data.reasoning_summary ||
                  "No narrative assessment is available for the current conditions."}
              </p>

              <div className="ai-assessment-meta">
                <span className="ai-meta-item">
                  Risk score
                  <span className="ai-meta-value">{Math.round(data.current_risk)}/100</span>
                </span>
                <span className="ai-meta-item">
                  Band
                  <span className="ai-meta-value">{data.current_risk_level}</span>
                </span>
                {forecast.data ? (
                  <span className="ai-meta-item">
                    Forecast peak
                    <span className="ai-meta-value">
                      {Math.round(forecast.data.peak_risk)} at {forecast.data.peak_at}
                    </span>
                  </span>
                ) : null}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Why is this area at risk? ------------------------------------------ */}
      <Card className="dash-section-gap">
        <CardHeader
          title="Why is this area at risk?"
          subtitle="Every weighted factor the risk engine used to produce the score above."
          action={<DataBadge mode="MODELLED" />}
        />
        <CardBody>
          {overview.isLoading ? (
            <Skeleton style={{ height: 200 }} />
          ) : (
            <FactorList factors={data?.explainability ?? []} />
          )}
        </CardBody>
      </Card>

      <ResponsibleAiNotice />
    </>
  );
}

/* -------------------------------------------------------------------------- */
function RiskGauge({ score, level }: { score: number; level: string }) {
  const radius = 84;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="risk-gauge-figure">
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle className="risk-gauge-track" cx="100" cy="100" r={radius} strokeWidth="14" />
        <circle
          className="risk-gauge-value"
          cx="100"
          cy="100"
          r={radius}
          strokeWidth="14"
          stroke={riskColor(level)}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="risk-gauge-center">
        <p className="risk-gauge-score" style={{ color: riskColor(level) }}>
          {Math.round(clamped)}
        </p>
        <p className="risk-gauge-scale">out of 100</p>
      </div>
      <span className="sr-only">
        Current risk score {Math.round(clamped)} out of 100, {level} band.
      </span>
    </div>
  );
}

function SignalRow({
  icon,
  label,
  detail,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  value: string;
}) {
  return (
    <div className="signal-row">
      <span className="signal-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="signal-body">
        <p className="signal-label">{label}</p>
        <p className="signal-detail">{detail}</p>
      </div>
      <p className="signal-value">{value}</p>
    </div>
  );
}
