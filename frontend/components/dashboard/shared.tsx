"use client";

/** Presentational building blocks reused across every dashboard page. */

import { ArrowDownRight, ArrowUpRight, Info, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui";
import { RESPONSIBLE_AI_NOTICE } from "@/lib/constants";
import { cn, dataBadgeClass, formatNumber, riskColor } from "@/lib/utils";
import type { DataMode } from "@/types";

/* -------------------------------------------------------------------------- */
/* Data provenance badge                                                      */
/* -------------------------------------------------------------------------- */
export function DataBadge({
  mode,
  className,
}: {
  mode: DataMode | string | null | undefined;
  className?: string;
}) {
  const label = (mode ?? "SIMULATED").toUpperCase();
  return (
    <span
      className={cn(dataBadgeClass(mode), className)}
      title={`Data provenance: ${label}`}
    >
      {label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Page header                                                                */
/* -------------------------------------------------------------------------- */
export function PageHeader({
  title,
  subtitle,
  actions,
  badges,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  badges?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
        {badges ? <div className="badge-row">{badges}</div> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stat card                                                                  */
/* -------------------------------------------------------------------------- */
export function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  accent = "var(--primary)",
  accentSoft = "var(--primary-soft)",
  delta,
  hint,
  dataMode,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon?: LucideIcon;
  accent?: string;
  accentSoft?: string;
  /** Percentage change vs. the previous period. Positive = pollution rising. */
  delta?: number | null;
  hint?: string;
  dataMode?: DataMode | string;
}) {
  const hasDelta = delta !== null && delta !== undefined && Number.isFinite(delta);

  return (
    <article
      className="stat-card"
      style={
        {
          "--accent": accent,
          "--accent-soft": accentSoft,
        } as React.CSSProperties
      }
    >
      <div className="stat-card-head">
        <span className="stat-label">{label}</span>
        {Icon ? (
          <span className="stat-icon" aria-hidden="true">
            <Icon size={16} />
          </span>
        ) : null}
      </div>

      <p className="stat-value">
        {typeof value === "number" ? formatNumber(value) : value}
        {suffix ? <small>{suffix}</small> : null}
      </p>

      <div className="stat-footer">
        {hasDelta ? (
          <span className={cn("stat-delta", (delta as number) >= 0 ? "is-up" : "is-down")}>
            {(delta as number) >= 0 ? (
              <ArrowUpRight size={13} aria-hidden="true" />
            ) : (
              <ArrowDownRight size={13} aria-hidden="true" />
            )}
            {Math.abs(delta as number).toFixed(1)}%
          </span>
        ) : null}
        {hint ? <span>{hint}</span> : null}
        {dataMode ? <DataBadge mode={dataMode} /> : null}
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Risk level badge                                                           */
/* -------------------------------------------------------------------------- */
export function RiskBadge({ level }: { level: string | null | undefined }) {
  const normalised = (level ?? "MODERATE").toUpperCase();
  const variant =
    normalised === "LOW"
      ? "success"
      : normalised === "MODERATE"
        ? "warning"
        : normalised === "HIGH"
          ? "warning"
          : "danger";

  return (
    <Badge variant={variant as "success" | "warning" | "danger"}>
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: riskColor(normalised),
          display: "inline-block",
        }}
      />
      {normalised} RISK
    </Badge>
  );
}

/* -------------------------------------------------------------------------- */
/* Responsible AI notice                                                      */
/* -------------------------------------------------------------------------- */
export function ResponsibleAiNotice({ className }: { className?: string }) {
  return (
    <aside className={cn("responsible-ai", className)}>
      <ShieldCheck size={18} aria-hidden="true" />
      <p>
        <strong>Responsible AI.</strong> {RESPONSIBLE_AI_NOTICE}
      </p>
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/* Detail list                                                                */
/* -------------------------------------------------------------------------- */
export function DetailList({
  items,
}: {
  items: { label: string; value: React.ReactNode }[];
}) {
  return (
    <dl className="detail-list">
      {items.map((item) => (
        <div className="detail-row" key={item.label}>
          <dt className="detail-label">{item.label}</dt>
          <dd className="detail-value">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* -------------------------------------------------------------------------- */
/* Contributing factors ("why is this at risk?")                              */
/* -------------------------------------------------------------------------- */
export function FactorList({
  factors,
}: {
  factors: {
    label: string;
    weight_pct: number;
    detail: string;
    direction?: "increase" | "decrease" | "neutral";
  }[];
}) {
  if (!factors.length) {
    return (
      <p className="text-muted" style={{ fontSize: "var(--text-sm)" }}>
        No contributing factors were recorded for this assessment.
      </p>
    );
  }

  const maxWeight = Math.max(...factors.map((factor) => Math.abs(factor.weight_pct)), 1);

  return (
    <div className="factor-list">
      {factors.map((factor) => {
        const direction = factor.direction ?? (factor.weight_pct >= 0 ? "increase" : "decrease");
        const width = (Math.abs(factor.weight_pct) / maxWeight) * 100;
        const color =
          direction === "increase"
            ? "var(--danger)"
            : direction === "decrease"
              ? "var(--success)"
              : "var(--muted)";

        return (
          <div className="factor-item" key={`${factor.label}-${factor.weight_pct}`}>
            <div className="factor-head">
              <span className="factor-label">{factor.label}</span>
              <span className={cn("factor-weight", `is-${direction}`)}>
                {factor.weight_pct >= 0 ? "+" : "−"}
                {Math.abs(factor.weight_pct).toFixed(1)}%
              </span>
            </div>
            <div className="factor-bar-track">
              <div
                className="factor-bar-fill"
                style={{ width: `${width}%`, background: color }}
              />
            </div>
            <p className="factor-detail">{factor.detail}</p>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Demo-data notice                                                           */
/* -------------------------------------------------------------------------- */
export function DemoDataNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div className="disclaimer">
      <Info size={16} aria-hidden="true" />
      <span>
        {children ??
          "This prototype is populated with deterministic demonstration data. Values labelled SIMULATED or MODELLED are not live regulatory measurements."}
      </span>
    </div>
  );
}
