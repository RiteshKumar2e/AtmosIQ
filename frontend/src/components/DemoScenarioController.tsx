"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  Flame,
  Loader2,
  Play,
  RotateCcw,
  Satellite,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AiDisclaimer, ConfidenceBadge, RiskBadge } from "@/components/indicators";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { ApiError, api, assetUrl } from "@/lib/api";
import { canOperate, useAuth } from "@/lib/auth";
import type { ScenarioResult } from "@/lib/types";
import { cn, eventLabel } from "@/lib/utils";

const STEP_ICONS: Record<string, React.ElementType> = {
  report_received: Users,
  environmental_fusion: Satellite,
  ai_analysis: Sparkles,
  risk_scored: Flame,
  hotspot: Flame,
  forecast: TrendingUp,
  alert: AlertTriangle,
};

/** Reveal cadence for the played sequence — slow enough to narrate over. */
const STEP_REVEAL_MS = 900;

export function DemoScenarioController({
  className,
  onComplete,
}: {
  className?: string;
  onComplete?: (result: ScenarioResult) => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [running, setRunning] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [revealed, setRevealed] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const invalidate = useCallback(() => {
    // Every surface that could be affected by a new hotspot.
    for (const key of [
      "overview", "map-layers", "hotspots", "alerts", "alert-summary",
      "forecast", "reports", "trends",
    ]) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  }, [queryClient]);

  const run = useCallback(async () => {
    if (!user) {
      toast.error("Sign in to run the scenario", {
        description: "Use a demo account on the sign-in page.",
      });
      return;
    }

    clearTimers();
    setRunning(true);
    setResult(null);
    setRevealed(0);

    try {
      const scenario = await api.runScenario();
      setResult(scenario);

      // Reveal the pipeline stages in sequence. The work is already done —
      // this paces the *story* so a presenter can talk through each stage.
      scenario.steps.forEach((_, index) => {
        timersRef.current.push(
          setTimeout(() => setRevealed(index + 1), index * STEP_REVEAL_MS),
        );
      });

      timersRef.current.push(
        setTimeout(
          () => {
            setRunning(false);
            invalidate();
            onComplete?.(scenario);
            toast.success("Authority alert dispatched", {
              description: `${scenario.hotspot.risk_level} risk at ${scenario.hotspot.location_label}`,
            });
          },
          scenario.steps.length * STEP_REVEAL_MS,
        ),
      );
    } catch (error) {
      setRunning(false);
      const message =
        error instanceof ApiError ? error.message : "The scenario could not be run.";
      // A 409 is the pipeline honestly declining to escalate, not a crash.
      if (error instanceof ApiError && error.status === 409) {
        toast.warning("Below escalation threshold", { description: message, duration: 9000 });
      } else {
        toast.error("Scenario failed", { description: message });
      }
    }
  }, [user, clearTimers, invalidate, onComplete]);

  const reset = useCallback(async () => {
    setResetting(true);
    try {
      const response = await api.resetScenario();
      clearTimers();
      setResult(null);
      setRevealed(0);
      invalidate();
      toast.success("Scenario reset", {
        description:
          `Removed ${response.reports_removed} report(s), ${response.hotspots_removed} hotspot(s), ` +
          `and ${response.alerts_removed} alert(s). Seeded data is untouched.`,
      });
    } catch (error) {
      toast.error("Reset failed", {
        description: error instanceof ApiError ? error.message : "Please try again.",
      });
    } finally {
      setResetting(false);
    }
  }, [clearTimers, invalidate]);

  const canRun = canOperate(user);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-line)] bg-[var(--color-brand-50)] px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--color-brand-800)]">
              Live detection scenario
            </h3>
            <Badge tone="brand" size="sm">Demo</Badge>
          </div>
          <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-[var(--color-ink-muted)]">
            Runs the production pipeline end to end — citizen signal, multimodal AI analysis, risk
            fusion, hotspot registration, forecast, authority alert. Nothing is replayed from a
            script.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {result && !running && (
            <Button variant="secondary" size="sm" onClick={reset} loading={resetting}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reset
            </Button>
          )}
          <Button size="sm" onClick={run} loading={running} disabled={!canRun}>
            {!running && <Play className="h-3.5 w-3.5" aria-hidden />}
            {running ? "Running…" : "Run live scenario"}
          </Button>
        </div>
      </div>

      {!canRun && (
        <div className="border-b border-[var(--color-line)] bg-[var(--color-risk-moderate-soft)] px-4 py-2">
          <p className="text-[11px] text-[var(--color-ink-muted)]">
            {user
              ? "Running the scenario requires an authority or analyst role. Sign in as Demo Authority."
              : "Sign in with a demo account to run the scenario."}{" "}
            <Link href="/login" className="font-medium text-[var(--color-brand-700)] underline">
              Go to sign in
            </Link>
          </p>
        </div>
      )}

      <div className="p-4">
        {!result && !running && <ScenarioIdle />}
        {(running || result) && result && (
          <ScenarioTimeline result={result} revealed={revealed} />
        )}
        {running && !result && (
          <div className="flex items-center gap-2 py-6 text-xs text-[var(--color-ink-muted)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Submitting citizen signal and running the detection pipeline…
          </div>
        )}
      </div>
    </Card>
  );
}

function ScenarioIdle() {
  const stages = [
    "Citizen signal",
    "AI analysis",
    "Environmental fusion",
    "Hotspot detection",
    "Forecast",
    "Authority action",
  ];

  return (
    <div>
      <p className="text-xs leading-relaxed text-[var(--color-ink-muted)]">
        A resident near an industrial corridor photographs unusual smoke. No fixed monitoring
        station covers that location — this is exactly the blind spot AeroShield exists to close.
      </p>
      <ol className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {stages.map((stage, index) => (
          <li key={stage} className="flex items-center gap-1.5">
            <span className="rounded border border-[var(--color-line)] bg-[var(--color-surface-sunken)] px-2 py-1 text-[11px] text-[var(--color-ink-muted)]">
              {stage}
            </span>
            {index < stages.length - 1 && (
              <span className="text-[var(--color-ink-subtle)]" aria-hidden>→</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ScenarioTimeline({
  result,
  revealed,
}: {
  result: ScenarioResult;
  revealed: number;
}) {
  const complete = revealed >= result.steps.length;

  return (
    <div className="space-y-4">
      <ol className="space-y-0">
        {result.steps.map((step, index) => {
          const shown = index < revealed;
          const isCurrent = index === revealed - 1 && !complete;
          const Icon = STEP_ICONS[step.key] ?? Check;

          return (
            <li
              key={`${step.key}-${index}`}
              className={cn(
                "flex gap-3 transition-opacity duration-300",
                shown ? "opacity-100" : "opacity-25",
              )}
            >
              {/* Rail */}
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors",
                    shown
                      ? "border-[var(--color-brand-300)] bg-[var(--color-brand-100)] text-[var(--color-brand-700)]"
                      : "border-[var(--color-line)] bg-[var(--color-surface-sunken)] text-[var(--color-ink-subtle)]",
                    isCurrent && "animate-[var(--animate-pulse-soft)]",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                {index < result.steps.length - 1 && (
                  <span
                    className={cn(
                      "w-px flex-1 transition-colors",
                      shown ? "bg-[var(--color-brand-200)]" : "bg-[var(--color-line)]",
                    )}
                  />
                )}
              </div>

              {/* Content */}
              <div className={cn("min-w-0 pb-4", shown && "animate-[var(--animate-slide-up)]")}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold text-[var(--color-ink)]">{step.title}</p>
                  {shown && step.duration_ms > 0 && (
                    <span className="text-[10px] tabular text-[var(--color-ink-subtle)]">
                      +{step.duration_ms} ms
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
                  {step.detail}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {complete && <ScenarioOutcome result={result} />}
    </div>
  );
}

function ScenarioOutcome({ result }: { result: ScenarioResult }) {
  const image = assetUrl(result.report.image_url);

  return (
    <div className="animate-[var(--animate-slide-up)] space-y-3 rounded-md border border-[var(--color-line)] bg-[var(--color-surface-sunken)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <RiskBadge level={result.hotspot.risk_level} score={result.hotspot.risk_score} />
        <ConfidenceBadge value={result.hotspot.confidence} />
        <Badge tone="neutral" size="md">
          {eventLabel(result.assessment.event_type)}
        </Badge>
        <Badge tone={result.ai_provider === "GEMINI" ? "brand" : "neutral"} size="md">
          {result.ai_provider === "GEMINI" ? "Analysed by Gemini" : "Demo-mode analyser"}
        </Badge>
        <span className="ml-auto text-[10px] tabular text-[var(--color-ink-subtle)]">
          {(result.total_ms / 1000).toFixed(1)}s end to end
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-[128px_1fr]">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt="Synthetic scene submitted by the scenario for multimodal analysis"
            className="h-24 w-full rounded border border-[var(--color-line)] object-cover sm:h-full"
            loading="lazy"
          />
        )}
        <div className="min-w-0 space-y-2">
          <p className="text-xs leading-relaxed text-[var(--color-ink-muted)]">
            {result.assessment.ai_summary}
          </p>
          <div className="rounded border border-[var(--color-risk-high-line)] bg-[var(--color-risk-high-soft)] px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-risk-high)]">
              Recommended intervention
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-ink)]">
              {result.alert.recommended_action}
            </p>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Hotspot probability" value={`${Math.round(result.hotspot.hotspot_probability * 100)}%`} />
        <Stat label="Population exposed" value={result.hotspot.population_exposed.toLocaleString()} />
        <Stat label="Affected radius" value={`${result.hotspot.radius_km.toFixed(1)} km`} />
        <Stat
          label="6h forecast"
          value={`${Math.round(result.forecast.peak_risk)} peak`}
          hint={result.forecast.trend.toLowerCase()}
        />
      </dl>

      <div className="flex flex-wrap gap-2">
        <Link href={`/reports/${result.report.id}`}>
          <Button size="sm" variant="secondary">View full assessment</Button>
        </Link>
        <Link href="/alerts">
          <Button size="sm" variant="secondary">Open alert centre</Button>
        </Link>
        <Link href="/hotspots">
          <Button size="sm" variant="secondary">See on map</Button>
        </Link>
      </div>

      <AiDisclaimer />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-2">
      <dt className="text-[9px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold tabular text-[var(--color-ink)]">
        {value}
        {hint && (
          <span className="ml-1 text-[10px] font-normal capitalize text-[var(--color-ink-muted)]">
            {hint}
          </span>
        )}
      </dd>
    </div>
  );
}
