"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Loader2, PlayCircle } from "lucide-react";
import { useState } from "react";

import { DataBadge } from "@/components/dashboard/shared";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTrigger,
  InlineAlert,
} from "@/components/ui";
import { useToast } from "@/hooks/useToast";
import { ApiError, demoApi } from "@/lib/api";
import { cn, formatNumber, riskColor, titleCase } from "@/lib/utils";
import type { DemoScenario } from "@/types";

const OUTLINE = [
  { key: "report", title: "Citizen report received", detail: "A geolocated observation with a photograph enters the pipeline." },
  { key: "analysis", title: "Image analysed", detail: "Multimodal AI classifies the event type and visible indicators." },
  { key: "risk", title: "Risk calculated", detail: "The engine fuses visual, sensor and meteorological evidence." },
  { key: "hotspot", title: "Hotspot detected", detail: "The event clears threshold and is promoted to a tracked hotspot." },
  { key: "forecast", title: "Forecast updated", detail: "A six-hour projection is generated for the affected area." },
  { key: "alert", title: "Authority alert generated", detail: "A ranked early warning is raised for the responding unit." },
  { key: "action", title: "Recommended action", detail: "The alert closes with a concrete operational next step." },
];

/**
 * Runs the scripted end-to-end demonstration against the live pipeline.
 *
 * This is the fastest way to show the whole system working in a presentation:
 * one click takes a synthetic citizen report through analysis, scoring,
 * hotspot detection, forecasting and alerting.
 */
export function DemoSimulation() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DemoScenario | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState(0);

  const run = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    setCompletedSteps(0);

    // Advance the visible checklist while the request is in flight so the
    // pipeline stages are legible rather than appearing all at once.
    const ticker = setInterval(() => {
      setCompletedSteps((current) => Math.min(current + 1, OUTLINE.length - 1));
    }, 420);

    try {
      const scenario = await demoApi.run();
      setResult(scenario);
      setCompletedSteps(OUTLINE.length);
      toast.success(
        "Simulation complete",
        `Hotspot raised at ${scenario.hotspot.location_label}.`,
      );
      // Every dashboard surface now has new data behind it.
      await queryClient.invalidateQueries();
    } catch (caught) {
      const message =
        caught instanceof ApiError
          ? caught.message
          : "The simulation could not be completed.";
      setError(message);
      setCompletedSteps(0);
      toast.error("Simulation failed", message);
    } finally {
      clearInterval(ticker);
      setRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary">
          <PlayCircle size={16} aria-hidden="true" />
          Run Simulation
        </Button>
      </DialogTrigger>

      <DialogContent
        title="Run Pollution Event Simulation"
        description="Executes the full detection pipeline end to end against the live backend."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button onClick={run} loading={running}>
              {result ? "Run again" : "Start simulation"}
            </Button>
          </>
        }
      >
        {error ? <InlineAlert variant="error">{error}</InlineAlert> : null}

        <p
          className="text-muted"
          style={{ fontSize: "var(--text-sm)", lineHeight: 1.7, marginBottom: 18 }}
        >
          A synthetic citizen report is placed deliberately away from any monitoring station —
          in the coverage gap this platform exists to close — and pushed through every stage
          of the pipeline.
        </p>

        <div className="simulation-steps">
          {OUTLINE.map((step, index) => {
            const isComplete = completedSteps > index;
            const isRunning = running && completedSteps === index;

            return (
              <div
                className={cn(
                  "simulation-step",
                  isComplete && "is-complete",
                  isRunning && "is-running",
                  !isComplete && !isRunning && "is-pending",
                )}
                key={step.key}
              >
                <span className="simulation-step-marker" aria-hidden="true">
                  {isComplete ? (
                    <CheckCircle2 size={15} />
                  ) : isRunning ? (
                    <Loader2 size={14} className="spinner" />
                  ) : (
                    <Circle size={13} />
                  )}
                </span>
                <div>
                  <p className="simulation-step-title">{step.title}</p>
                  <p className="simulation-step-detail">{step.detail}</p>
                </div>
              </div>
            );
          })}
        </div>

        {result ? (
          <div className="pipeline-result" style={{ marginTop: 20 }}>
            <div className="pipeline-result-head">
              <CheckCircle2 size={19} aria-hidden="true" style={{ color: "var(--success)" }} />
              <div>
                <p style={{ fontWeight: 650 }}>{result.title}</p>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--muted)" }}>
                  Completed in {formatNumber(result.total_ms)} ms · AI provider{" "}
                  {result.ai_provider}
                </p>
              </div>
            </div>

            <p style={{ fontSize: "var(--text-sm)", lineHeight: 1.7, marginBottom: 14 }}>
              {result.narrative}
            </p>

            <dl className="detail-list">
              <div className="detail-row">
                <dt className="detail-label">Detected hotspot</dt>
                <dd className="detail-value">{result.hotspot.location_label}</dd>
              </div>
              <div className="detail-row">
                <dt className="detail-label">Risk score</dt>
                <dd
                  className="detail-value"
                  style={{ color: riskColor(result.hotspot.risk_level) }}
                >
                  {Math.round(result.hotspot.risk_score)} / 100 · {result.hotspot.risk_level}
                </dd>
              </div>
              <div className="detail-row">
                <dt className="detail-label">Event type</dt>
                <dd className="detail-value">{titleCase(result.assessment.event_type)}</dd>
              </div>
              <div className="detail-row">
                <dt className="detail-label">Confidence</dt>
                <dd className="detail-value">
                  {Math.round(result.assessment.confidence * 100)}%
                </dd>
              </div>
              <div className="detail-row">
                <dt className="detail-label">Alert raised</dt>
                <dd className="detail-value">{result.alert.title}</dd>
              </div>
              <div className="detail-row">
                <dt className="detail-label">Forecast peak</dt>
                <dd className="detail-value">
                  {Math.round(result.forecast.peak_risk)} at {result.forecast.peak_at}
                </dd>
              </div>
            </dl>

            <div style={{ marginTop: 14 }}>
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  marginBottom: 6,
                }}
              >
                Recommended action
              </p>
              <p style={{ fontSize: "var(--text-sm)", lineHeight: 1.7 }}>
                {result.alert.recommended_action}
              </p>
            </div>

            <div style={{ marginTop: 14 }}>
              <DataBadge mode="MODELLED" />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
