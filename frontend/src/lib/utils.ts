import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type { DataMode, RiskLevel } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* -------------------------------------------------------------------------
   Risk presentation
   ------------------------------------------------------------------------- */
export const RISK_ORDER: RiskLevel[] = ["LOW", "MODERATE", "HIGH", "CRITICAL"];

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 75) return "CRITICAL";
  if (score >= 55) return "HIGH";
  if (score >= 35) return "MODERATE";
  return "LOW";
}

/** Hex values kept in sync with the CSS tokens, for canvas/map/chart use. */
export const RISK_HEX: Record<RiskLevel, string> = {
  LOW: "#2f7d55",
  MODERATE: "#a9750d",
  HIGH: "#c05621",
  CRITICAL: "#b42318",
};

export const RISK_CLASSES: Record<RiskLevel, { text: string; bg: string; border: string; dot: string }> = {
  LOW: {
    text: "text-[var(--color-risk-low)]",
    bg: "bg-[var(--color-risk-low-soft)]",
    border: "border-[var(--color-risk-low-line)]",
    dot: "bg-[var(--color-risk-low)]",
  },
  MODERATE: {
    text: "text-[var(--color-risk-moderate)]",
    bg: "bg-[var(--color-risk-moderate-soft)]",
    border: "border-[var(--color-risk-moderate-line)]",
    dot: "bg-[var(--color-risk-moderate)]",
  },
  HIGH: {
    text: "text-[var(--color-risk-high)]",
    bg: "bg-[var(--color-risk-high-soft)]",
    border: "border-[var(--color-risk-high-line)]",
    dot: "bg-[var(--color-risk-high)]",
  },
  CRITICAL: {
    text: "text-[var(--color-risk-critical)]",
    bg: "bg-[var(--color-risk-critical-soft)]",
    border: "border-[var(--color-risk-critical-line)]",
    dot: "bg-[var(--color-risk-critical)]",
  },
};

export const DATA_MODE_LABEL: Record<DataMode, string> = {
  LIVE: "Live",
  SIMULATED: "Simulated",
  MODELLED: "Modelled",
};

export const DATA_MODE_HINT: Record<DataMode, string> = {
  LIVE: "Measured in real time by an external provider",
  SIMULATED: "Synthetic demonstration data — deterministic and reproducible",
  MODELLED: "Derived by the AeroShield risk or forecast engines",
};

/* -------------------------------------------------------------------------
   Formatting
   ------------------------------------------------------------------------- */
export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("en", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

export function formatPercent(value: number, digits = 0): string {
  return `${value >= 0 ? "" : ""}${value.toFixed(digits)}%`;
}

/** "14 minutes ago" — the operational time reference in an alert queue. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const seconds = Math.round((Date.now() - then) / 1000);

  if (seconds < 0) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatCoords(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${ns}, ${Math.abs(lon).toFixed(4)}°${ew}`;
}

/** Convert a snake_case event key into a readable label. */
export function humanise(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const EVENT_LABELS: Record<string, string> = {
  industrial_smoke: "Industrial Smoke Emission",
  agricultural_burning: "Agricultural Residue Burning",
  construction_dust: "Construction Dust",
  traffic_pollution: "Traffic-Related Pollution",
  waste_burning: "Open Waste Burning",
  haze_smog: "Haze / Smog Accumulation",
  unknown: "Unclassified Environmental Event",
};

export function eventLabel(key: string): string {
  return EVENT_LABELS[key] ?? humanise(key);
}

/** AQI category colouring, distinct from the platform's own risk ramp. */
export function aqiTone(aqi: number): { label: string; className: string } {
  if (aqi <= 50) return { label: "Good", className: "text-[var(--color-risk-low)]" };
  if (aqi <= 100) return { label: "Satisfactory", className: "text-[var(--color-risk-low)]" };
  if (aqi <= 200) return { label: "Moderate", className: "text-[var(--color-risk-moderate)]" };
  if (aqi <= 300) return { label: "Poor", className: "text-[var(--color-risk-high)]" };
  if (aqi <= 400) return { label: "Very Poor", className: "text-[var(--color-risk-critical)]" };
  return { label: "Severe", className: "text-[var(--color-risk-critical)]" };
}

export const ALERT_STATUS_LABEL: Record<string, string> = {
  NEW: "New",
  ACKNOWLEDGED: "Acknowledged",
  ASSIGNED: "Assigned",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
};

/** Chart palette — categorical, colour-blind safe, distinct from the risk ramp. */
export const CHART_COLORS = [
  "#34756f",
  "#2b6cb0",
  "#a9750d",
  "#7c5cbf",
  "#c05621",
  "#4e948c",
  "#9d174d",
];

export function trendIcon(trend: string): "up" | "down" | "flat" {
  if (trend === "INCREASING") return "up";
  if (trend === "DECREASING") return "down";
  return "flat";
}
