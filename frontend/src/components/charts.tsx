"use client";

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
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  CoveragePoint,
  ForecastPoint,
  RegionDistribution,
  SourceBreakdown,
  TrendPoint,
} from "@/lib/types";
import { CHART_COLORS, RISK_HEX, cn, riskLevelFromScore } from "@/lib/utils";

/* --------------------------------------------------------------------------
   Shared chart chrome. Defined once so every chart in the product reads as
   one system: same grid weight, same axis colour, same tooltip.
   -------------------------------------------------------------------------- */
const AXIS = {
  stroke: "#838f99",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

const GRID_COLOR = "#e2e6e9";

function ChartTooltip({
  active,
  payload,
  label,
  unit = "",
  formatter,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string; dataKey?: string }[];
  label?: string | number;
  unit?: string;
  formatter?: (value: number, name: string) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-[var(--color-line)] bg-white px-2.5 py-2 shadow-[var(--shadow-overlay)]">
      {label !== undefined && (
        <p className="mb-1 text-[11px] font-semibold text-[var(--color-ink)]">{label}</p>
      )}
      <ul className="space-y-0.5">
        {payload.map((entry, index) => (
          <li key={index} className="flex items-center gap-2 text-[11px]">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="text-[var(--color-ink-muted)]">{entry.name}</span>
            <span className="ml-auto font-semibold tabular text-[var(--color-ink)]">
              {formatter && typeof entry.value === "number"
                ? formatter(entry.value, entry.name ?? "")
                : `${entry.value}${unit}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartFrame({
  height = 260,
  children,
  className,
}: {
  height?: number;
  children: React.ReactElement;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

/* ==========================================================================
   ForecastChart — risk trajectory with an uncertainty band.

   The band is drawn as a filled area behind the line rather than as error
   bars: at a 6-hour horizon the growing width of the band is the message,
   and an area reads that growth instantly.
   ========================================================================== */
export function ForecastChart({
  points,
  height = 280,
  showBand = true,
}: {
  points: ForecastPoint[];
  height?: number;
  showBand?: boolean;
}) {
  const data = points.map((point) => ({
    time: point.hour_label,
    risk: point.risk_score,
    lower: point.lower_bound,
    // Recharts stacks areas, so the band is expressed as (lower, thickness).
    band: Number((point.upper_bound - point.lower_bound).toFixed(1)),
    upper: point.upper_bound,
    confidence: Math.round(point.confidence * 100),
    pm25: point.pm25_estimate,
  }));

  return (
    <ChartFrame height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="risk-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34756f" stopOpacity={0.24} />
            <stop offset="100%" stopColor="#34756f" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="time" {...AXIS} />
        <YAxis domain={[0, 100]} {...AXIS} width={44} />

        {/* Risk band boundaries give the reader an absolute frame of reference. */}
        <ReferenceLine y={75} stroke={RISK_HEX.CRITICAL} strokeDasharray="4 4" strokeOpacity={0.5}
          label={{ value: "Critical", position: "insideTopRight", fontSize: 9, fill: RISK_HEX.CRITICAL }} />
        <ReferenceLine y={55} stroke={RISK_HEX.HIGH} strokeDasharray="4 4" strokeOpacity={0.45}
          label={{ value: "High", position: "insideTopRight", fontSize: 9, fill: RISK_HEX.HIGH }} />
        <ReferenceLine y={35} stroke={RISK_HEX.MODERATE} strokeDasharray="4 4" strokeOpacity={0.4}
          label={{ value: "Moderate", position: "insideTopRight", fontSize: 9, fill: RISK_HEX.MODERATE }} />

        <Tooltip
          content={
            <ChartTooltip
              formatter={(value, name) =>
                name === "Confidence" ? `${value}%` : `${value}`
              }
            />
          }
        />

        {showBand && (
          <>
            <Area
              type="monotone"
              dataKey="lower"
              stackId="band"
              stroke="none"
              fill="transparent"
              name="Lower bound"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="band"
              stackId="band"
              stroke="none"
              fill="#34756f"
              fillOpacity={0.13}
              name="Uncertainty range"
              isAnimationActive={false}
            />
          </>
        )}

        <Area
          type="monotone"
          dataKey="risk"
          stroke="#285d59"
          strokeWidth={2}
          fill="url(#risk-fill)"
          name="Predicted risk"
          dot={{ r: 3, fill: "#285d59", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ChartFrame>
  );
}

/* ==========================================================================
   PollutionTrendChart
   ========================================================================== */
export function PollutionTrendChart({
  data,
  height = 260,
  metric = "both",
}: {
  data: TrendPoint[];
  height?: number;
  metric?: "both" | "risk" | "pm";
}) {
  return (
    <ChartFrame height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="period" {...AXIS} minTickGap={24} />
        <YAxis {...AXIS} width={44} />
        <Tooltip content={<ChartTooltip />} />
        <Legend
          verticalAlign="top"
          height={28}
          iconType="plainline"
          wrapperStyle={{ fontSize: 11, color: "#5b6670" }}
        />

        {metric !== "risk" && (
          <>
            <Line
              type="monotone"
              dataKey="avg_pm25"
              name="PM2.5 (µg/m³)"
              stroke={CHART_COLORS[0]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="avg_pm10"
              name="PM10 (µg/m³)"
              stroke={CHART_COLORS[1]}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
            />
          </>
        )}
        {metric !== "pm" && (
          <Line
            type="monotone"
            dataKey="avg_risk"
            name="Risk score"
            stroke={CHART_COLORS[2]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        )}
      </LineChart>
    </ChartFrame>
  );
}

/* ==========================================================================
   SourceBreakdownChart — pollution source attribution
   ========================================================================== */
export function SourceBreakdownChart({
  data,
  height = 260,
}: {
  data: SourceBreakdown[];
  height?: number;
}) {
  return (
    <ChartFrame height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius="52%"
          outerRadius="78%"
          paddingAngle={2}
          strokeWidth={1}
          stroke="#ffffff"
        >
          {data.map((entry, index) => (
            <Cell key={entry.source} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={
            <ChartTooltip
              formatter={(value, name) => {
                const item = data.find((d) => d.label === name);
                return `${value} (${item?.share_pct.toFixed(1) ?? 0}%)`;
              }}
            />
          }
        />
        <Legend
          verticalAlign="bottom"
          height={44}
          iconType="circle"
          wrapperStyle={{ fontSize: 11, color: "#5b6670" }}
        />
      </PieChart>
    </ChartFrame>
  );
}

/* ==========================================================================
   RegionDistributionChart — hotspot load across BRICS regions
   ========================================================================== */
export function RegionDistributionChart({
  data,
  height = 260,
}: {
  data: RegionDistribution[];
  height?: number;
}) {
  return (
    <ChartFrame height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" {...AXIS} allowDecimals={false} />
        <YAxis type="category" dataKey="name" {...AXIS} width={132} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f3f4" }} />
        <Bar dataKey="hotspots" name="Active hotspots" radius={[0, 3, 3, 0]} barSize={16}>
          {data.map((entry) => (
            <Cell key={entry.region_code} fill={RISK_HEX[riskLevelFromScore(entry.avg_risk)]} />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}

/* ==========================================================================
   ParticipationChart — citizen reporting volume
   ========================================================================== */
export function ParticipationChart({
  data,
  height = 240,
}: {
  data: TrendPoint[];
  height?: number;
}) {
  return (
    <ChartFrame height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="period" {...AXIS} minTickGap={20} />
        <YAxis {...AXIS} width={40} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f3f4" }} />
        <Bar
          dataKey="reports"
          name="Citizen reports"
          fill={CHART_COLORS[0]}
          radius={[3, 3, 0, 0]}
          maxBarSize={28}
        />
      </BarChart>
    </ChartFrame>
  );
}

/* ==========================================================================
   CoverageChart — the argument for citizen sensing.

   Station coverage is flat because fixed networks do not grow; citizen
   coverage climbs. Showing them on one axis makes the gap self-evident
   without needing a caption to argue it.
   ========================================================================== */
export function CoverageChart({
  data,
  height = 260,
}: {
  data: CoveragePoint[];
  height?: number;
}) {
  return (
    <ChartFrame height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="coverage-combined" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.28} />
            <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis {...AXIS} width={44} unit="%" domain={[0, "auto"]} />
        <Tooltip content={<ChartTooltip formatter={(value) => `${value}%`} />} />
        <Legend
          verticalAlign="top"
          height={28}
          iconType="plainline"
          wrapperStyle={{ fontSize: 11, color: "#5b6670" }}
        />
        <Area
          type="monotone"
          dataKey="combined_coverage_pct"
          name="Combined coverage"
          stroke={CHART_COLORS[0]}
          strokeWidth={2}
          fill="url(#coverage-combined)"
        />
        <Area
          type="monotone"
          dataKey="station_coverage_pct"
          name="Fixed stations only"
          stroke={CHART_COLORS[1]}
          strokeWidth={1.8}
          strokeDasharray="4 3"
          fill="transparent"
        />
      </AreaChart>
    </ChartFrame>
  );
}

/* ==========================================================================
   MiniSparkline — inline trend inside dense cards
   ========================================================================== */
export function MiniSparkline({
  data,
  dataKey = "avg_risk",
  color = "#34756f",
  height = 40,
}: {
  data: Record<string, unknown>[];
  dataKey?: string;
  color?: string;
  height?: number;
}) {
  return (
    <ChartFrame height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#spark-${dataKey})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartFrame>
  );
}
