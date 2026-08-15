import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type { DataMode, RiskLevel } from "@/types";

/** Merge conditional class names, resolving Tailwind conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* -------------------------------------------------------------------------- */
/* Risk helpers                                                               */
/* -------------------------------------------------------------------------- */

/** Map a 0-100 risk score to the platform's four risk bands. */
export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "MODERATE";
  return "LOW";
}

const RISK_CLASS: Record<string, string> = {
  LOW: "risk-low",
  MODERATE: "risk-moderate",
  HIGH: "risk-high",
  CRITICAL: "risk-critical",
  SEVERE: "risk-critical",
};

/** Modifier suffix used by `badge-risk-*`, `text-risk-*` and map styling. */
export function riskKey(level: string | null | undefined): string {
  return RISK_CLASS[(level ?? "").toUpperCase()] ?? "risk-moderate";
}

export function riskBadgeClass(level: string | null | undefined): string {
  return `badge badge-${riskKey(level)}`;
}

const RISK_COLORS: Record<string, string> = {
  "risk-low": "#2c7a56",
  "risk-moderate": "#a86a12",
  "risk-high": "#c1611c",
  "risk-critical": "#b3372c",
};

/** Hex colour for a risk level — used by charts and the map, which cannot read CSS variables. */
export function riskColor(level: string | null | undefined): string {
  return RISK_COLORS[riskKey(level)];
}

export function riskColorFromScore(score: number): string {
  return riskColor(riskLevelFromScore(score));
}

/* -------------------------------------------------------------------------- */
/* Data provenance                                                            */
/* -------------------------------------------------------------------------- */
export function dataBadgeClass(mode: DataMode | string | null | undefined): string {
  const key = (mode ?? "SIMULATED").toUpperCase();
  if (key === "LIVE") return "data-badge data-badge-live";
  if (key === "MODELLED") return "data-badge data-badge-modelled";
  if (key === "AI ASSESSMENT" || key === "AI") return "data-badge data-badge-ai";
  return "data-badge data-badge-simulated";
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */
export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

/** Render a 0-1 confidence value as a percentage. */
export function formatConfidence(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const normalised = value > 1 ? value : value * 100;
  return `${Math.round(normalised)}%`;
}

export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatTime(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Compact relative time, e.g. "12m ago", "3h ago", "2d ago". */
export function timeAgo(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return "—";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

/** "industrial_emission" -> "Industrial Emission" */
export function titleCase(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function truncate(value: string, max = 120): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}…`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "AQ";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Convert a wind bearing in degrees to a compass point. */
export function compassFromDegrees(degrees: number): string {
  const points = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return points[Math.round(degrees / 22.5) % 16];
}
