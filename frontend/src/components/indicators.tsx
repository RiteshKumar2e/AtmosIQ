"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Radio,
  Satellite,
  Users,
  Wind as WindIcon,
} from "lucide-react";
import * as React from "react";

import { Badge, InfoTip, Meter } from "@/components/ui/primitives";
import type { Contribution, DataMode, RiskLevel } from "@/lib/types";
import {
  DATA_MODE_HINT,
  DATA_MODE_LABEL,
  RISK_CLASSES,
  RISK_HEX,
  cn,
  formatNumber,
} from "@/lib/utils";

/* ==========================================================================
   DataStatusBadge — provenance, shown wherever a number is displayed.

   This is the credibility backbone of the interface: a judge can point at any
   figure and immediately see whether it was measured, simulated, or derived.
   ========================================================================== */
export function DataStatusBadge({
  mode,
  className,
  showHint = true,
  size = "sm",
}: {
  mode: DataMode;
  className?: string;
  showHint?: boolean;
  size?: "sm" | "md";
}) {
  const tone = mode === "LIVE" ? "low" : mode === "MODELLED" ? "info" : "neutral";
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Badge tone={tone} size={size} className="gap-1">
        {mode === "LIVE" && (
          <span
            className="h-1.5 w-1.5 rounded-full bg-[var(--color-risk-low)] animate-[var(--animate-pulse-soft)]"
            aria-hidden
          />
        )}
        {DATA_MODE_LABEL[mode]}
      </Badge>
      {showHint && <InfoTip text={DATA_MODE_HINT[mode]} />}
    </span>
  );
}

/** A standing marker for content backed by the seeded demonstration dataset. */
export function DemoDataBadge({ className }: { className?: string }) {
  return (
    <Badge tone="neutral" size="sm" className={cn("border-dashed", className)}>
      Demo data
    </Badge>
  );
}

/* ==========================================================================
   RiskBadge / RiskScoreCard
   ========================================================================== */
export function RiskBadge({
  level,
  score,
  size = "md",
  className,
}: {
  level: RiskLevel;
  score?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const tone = level.toLowerCase() as "low" | "moderate" | "high" | "critical";
  return (
    <Badge tone={tone} size={size} className={cn("font-semibold", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", RISK_CLASSES[level].dot)} aria-hidden />
      {level}
      {score !== undefined && <span className="tabular">· {Math.round(score)}</span>}
    </Badge>
  );
}

export function ConfidenceBadge({
  value,
  className,
  label = "Confidence",
}: {
  value: number;
  className?: string;
  label?: string;
}) {
  const pct = Math.round(value * 100);
  const tone = pct >= 75 ? "low" : pct >= 50 ? "moderate" : "neutral";
  return (
    <Badge tone={tone} size="md" className={cn("tabular", className)}>
      {label} {pct}%
      <InfoTip
        text={
          "Confidence reflects evidence quality — how many independent channels " +
          "contributed, whether they were measured or modelled, and how closely " +
          "they agree. It is computed separately from the risk score."
        }
      />
    </Badge>
  );
}

export function DeltaIndicator({
  value,
  className,
  invert = false,
}: {
  value: number | null;
  className?: string;
  invert?: boolean;
}) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <span className={cn("text-xs text-[var(--color-ink-subtle)]", className)}>—</span>;
  }

  const rising = value > 0;
  const flat = Math.abs(value) < 0.5;
  // For pollution, rising is bad. `invert` flips that for metrics such as
  // citizen participation, where rising is good.
  const bad = invert ? !rising : rising;

  const Icon = flat ? ArrowRight : rising ? ArrowUpRight : ArrowDownRight;
  const tone = flat
    ? "text-[var(--color-ink-subtle)]"
    : bad
      ? "text-[var(--color-risk-high)]"
      : "text-[var(--color-risk-low)]";

  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular", tone, className)}>
      <Icon className="h-3 w-3" aria-hidden />
      {flat ? "no change" : `${Math.abs(value).toFixed(1)}%`}
    </span>
  );
}

/**
 * The primary risk readout. Deliberately not a gauge or a dial: an operator
 * needs the number, the band, and the direction of travel — a decorative
 * gauge would consume more space to convey less.
 */
export function RiskScoreCard({
  score,
  level,
  delta,
  caption,
  mode,
  className,
  compact = false,
}: {
  score: number;
  level: RiskLevel;
  delta?: number | null;
  caption?: string;
  mode?: DataMode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-semibold tabular leading-none",
            compact ? "text-2xl" : "text-4xl",
            RISK_CLASSES[level].text,
          )}
        >
          {Math.round(score)}
        </span>
        <span className={cn("text-[var(--color-ink-subtle)]", compact ? "text-xs" : "text-sm")}>
          / 100
        </span>
        {delta !== undefined && <DeltaIndicator value={delta ?? null} className="ml-1" />}
      </div>

      <div className="mt-2">
        <Meter value={score} color={RISK_HEX[level]} label={`Risk score ${Math.round(score)} of 100`} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <RiskBadge level={level} />
        {mode && <DataStatusBadge mode={mode} showHint={false} />}
      </div>

      {caption && (
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-ink-muted)]">{caption}</p>
      )}
    </div>
  );
}

/* ==========================================================================
   SourceIndicator — which evidence channel a signal came from
   ========================================================================== */
const SOURCE_META: Record<string, { label: string; icon: React.ElementType; hint: string }> = {
  CITIZEN_AI_FUSION: {
    label: "Citizen + AI fusion",
    icon: Users,
    hint: "Detected by fusing a citizen observation with environmental context",
  },
  STATION: {
    label: "Reference station",
    icon: Radio,
    hint: "Regulatory-grade fixed monitoring station",
  },
  SATELLITE: {
    label: "Satellite",
    icon: Satellite,
    hint: "Derived from satellite environmental features",
  },
  FUSED: {
    label: "Multi-signal fusion",
    icon: Activity,
    hint: "Combined across several independent evidence channels",
  },
};

export function SourceIndicator({ source, className }: { source: string; className?: string }) {
  const meta = SOURCE_META[source] ?? SOURCE_META.FUSED;
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] text-[var(--color-ink-muted)]",
        className,
      )}
      title={meta.hint}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {meta.label}
    </span>
  );
}

/* ==========================================================================
   ContributionBar — the explainability primitive.

   Shows *why* a score is what it is: each factor's share of the realised risk
   mass, with the underlying evidence spelled out beneath it.
   ========================================================================== */
export function ContributionList({
  contributions,
  className,
  limit,
  showDetail = true,
}: {
  contributions: Contribution[];
  className?: string;
  limit?: number;
  showDetail?: boolean;
}) {
  const items = limit ? contributions.slice(0, limit) : contributions;
  if (items.length === 0) {
    return (
      <p className={cn("text-xs text-[var(--color-ink-muted)]", className)}>
        No contributing factors were recorded for this assessment.
      </p>
    );
  }

  const max = Math.max(...items.map((c) => c.weight_pct), 1);

  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item) => (
        <li key={item.factor}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-xs font-medium text-[var(--color-ink)]">
              {item.label}
            </span>
            <span
              className={cn(
                "shrink-0 text-xs font-semibold tabular",
                item.direction === "decrease"
                  ? "text-[var(--color-risk-low)]"
                  : item.direction === "neutral"
                    ? "text-[var(--color-ink-muted)]"
                    : "text-[var(--color-risk-high)]",
              )}
            >
              {item.direction === "decrease" ? "−" : "+"}
              {item.weight_pct.toFixed(1)}%
            </span>
          </div>

          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-sunken)]">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${(item.weight_pct / max) * 100}%`,
                backgroundColor:
                  item.direction === "decrease"
                    ? "var(--color-risk-low)"
                    : item.direction === "neutral"
                      ? "var(--color-ink-subtle)"
                      : "var(--color-brand-500)",
              }}
            />
          </div>

          {showDetail && item.detail && (
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
              {item.detail}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ==========================================================================
   WindIndicator
   ========================================================================== */
export function WindIndicator({
  speedMs,
  directionDeg,
  compass,
  dispersionIndex,
  description,
  mode,
  className,
}: {
  speedMs: number;
  directionDeg: number;
  compass: string;
  dispersionIndex: number;
  description?: string;
  mode?: DataMode;
  className?: string;
}) {
  const dispersionTone =
    dispersionIndex < 0.3
      ? "text-[var(--color-risk-critical)]"
      : dispersionIndex < 0.5
        ? "text-[var(--color-risk-high)]"
        : "text-[var(--color-risk-low)]";

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface-sunken)]"
        title={`Wind from ${compass} (${Math.round(directionDeg)}°)`}
      >
        {/* Meteorological convention: the arrow points the way the air travels. */}
        <WindIcon
          className="h-4 w-4 text-[var(--color-brand-600)]"
          style={{ transform: `rotate(${(directionDeg + 180) % 360}deg)` }}
          aria-hidden
        />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-semibold tabular text-[var(--color-ink)]">
            {speedMs.toFixed(1)} m/s
          </span>
          <span className="text-xs text-[var(--color-ink-muted)]">from {compass}</span>
          {mode && <DataStatusBadge mode={mode} showHint={false} />}
        </div>
        <p className="mt-0.5 text-[11px] text-[var(--color-ink-muted)]">
          Dispersion index{" "}
          <span className={cn("font-semibold tabular", dispersionTone)}>
            {dispersionIndex.toFixed(2)}
          </span>
        </p>
        {description && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   KpiCard
   ========================================================================== */
export function KpiCard({
  label,
  value,
  unit,
  delta,
  level,
  mode,
  hint,
  icon,
  invertDelta = false,
  className,
}: {
  label: string;
  value: number;
  unit?: string;
  delta?: number | null;
  level?: string | null;
  mode?: DataMode;
  hint?: string;
  icon?: React.ReactNode;
  invertDelta?: boolean;
  className?: string;
}) {
  const risk = (level && ["LOW", "MODERATE", "HIGH", "CRITICAL"].includes(level)
    ? (level as RiskLevel)
    : null);

  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
          {label}
        </span>
        {icon && <span className="text-[var(--color-ink-subtle)]" aria-hidden>{icon}</span>}
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-3xl font-semibold leading-none tabular",
            risk ? RISK_CLASSES[risk].text : "text-[var(--color-ink)]",
          )}
        >
          {formatNumber(value, Number.isInteger(value) ? 0 : 1)}
        </span>
        {unit && <span className="text-sm text-[var(--color-ink-subtle)]">{unit}</span>}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {risk && <RiskBadge level={risk} size="sm" />}
        {delta !== undefined && delta !== null && (
          <DeltaIndicator value={delta} invert={invertDelta} />
        )}
        {delta !== undefined && delta !== null && (
          <span className="text-[10px] text-[var(--color-ink-subtle)]">vs yesterday</span>
        )}
      </div>

      {hint && (
        <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
          {hint}
        </p>
      )}

      {mode && (
        <div className="mt-2 border-t border-[var(--color-line)] pt-2">
          <DataStatusBadge mode={mode} showHint={false} />
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   AI provider indicator
   ========================================================================== */
export function AiProviderBadge({ provider, className }: { provider: string; className?: string }) {
  const live = provider === "GEMINI";
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Badge tone={live ? "brand" : "neutral"} size="sm">
        AI: {live ? "Gemini" : "Demo mode"}
      </Badge>
      <InfoTip
        text={
          live
            ? "Google Gemini is analysing submissions. The API key is held only on the server."
            : "No Gemini API key is configured, so a deterministic local analyser is producing " +
              "clearly-labelled results. Add GOOGLE_GEMINI_API_KEY to the backend .env to enable Gemini."
        }
      />
    </span>
  );
}

/** The standing caveat shown wherever an AI assessment is presented. */
export function AiDisclaimer({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "rounded-md border border-[var(--color-info-line)] bg-[var(--color-info-soft)] px-3 py-2 text-[11px] leading-relaxed text-[var(--color-ink-muted)]",
        className,
      )}
    >
      <span className="font-medium text-[var(--color-info)]">AI-generated assessment.</span>{" "}
      Not a substitute for certified environmental measurement. Visual analysis establishes the
      apparent character of an event, not its pollutant concentration.
    </p>
  );
}
