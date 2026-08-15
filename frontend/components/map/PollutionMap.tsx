"use client";

import maplibregl, { type Map as MapLibreMap, type StyleSpecification } from "maplibre-gl";
import { Navigation } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, MAP_STYLE_URL } from "@/lib/constants";
import { cn, formatNumber, riskColor, timeAgo, titleCase } from "@/lib/utils";
import type { Hotspot, MonitoringStation, Report, Wind } from "@/types";

/**
 * Interactive pollution intelligence map.
 *
 * Renders three layers — detected hotspots, citizen reports and fixed
 * monitoring stations — so the coverage gap between stations is visible rather
 * than merely asserted.
 *
 * Falls back to a keyless OpenStreetMap raster style when no
 * NEXT_PUBLIC_MAP_STYLE_URL is configured, so the map works out of the box.
 */

const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#eef3f2" } },
    { id: "osm", type: "raster", source: "osm", paint: { "raster-opacity": 0.82 } },
  ],
};

type LayerKey = "hotspots" | "reports" | "stations";

interface PollutionMapProps {
  hotspots?: Hotspot[];
  reports?: Report[];
  stations?: MonitoringStation[];
  wind?: Wind | null;
  compact?: boolean;
  className?: string;
  onSelectHotspot?: (hotspot: Hotspot) => void;
}

export function PollutionMap({
  hotspots = [],
  reports = [],
  stations = [],
  wind,
  compact = false,
  className,
  onSelectHotspot,
}: PollutionMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState<Record<LayerKey, boolean>>({
    hotspots: true,
    reports: true,
    stations: true,
  });

  // Keep the latest callback without re-running the marker effect on every render.
  const selectRef = useRef(onSelectHotspot);
  selectRef.current = onSelectHotspot;

  const style = useMemo<string | StyleSpecification>(
    () => (MAP_STYLE_URL ? MAP_STYLE_URL : OSM_STYLE),
    [],
  );

  /* ---------------------------------------------------------------------- */
  /* Initialise the map once                                                */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: DEFAULT_MAP_CENTER,
        zoom: compact ? DEFAULT_MAP_ZOOM - 0.8 : DEFAULT_MAP_ZOOM,
        attributionControl: { compact: true },
      });
    } catch {
      // WebGL unavailable (older machine, headless browser, blocked context).
      setFailed(true);
      return;
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => setReady(true));
    map.on("error", () => setFailed(true));

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [style, compact]);

  /* ---------------------------------------------------------------------- */
  /* Render markers whenever the data or layer visibility changes            */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const bounds = new maplibregl.LngLatBounds();
    let hasPoint = false;

    // Monitoring stations (drawn first so they sit beneath hotspots) --------
    if (visible.stations) {
      for (const station of stations) {
        const element = document.createElement("div");
        element.style.cssText = [
          "width:13px",
          "height:13px",
          "border-radius:3px",
          "background:#1c6394",
          "border:2px solid #fff",
          "box-shadow:0 1px 3px rgba(16,33,34,.35)",
          "cursor:pointer",
        ].join(";");
        element.setAttribute("aria-label", `Monitoring station: ${station.name}`);

        const marker = new maplibregl.Marker({ element })
          .setLngLat([station.longitude, station.latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 14, maxWidth: "300px" }).setHTML(
              stationPopup(station),
            ),
          )
          .addTo(map);

        markersRef.current.push(marker);
        bounds.extend([station.longitude, station.latitude]);
        hasPoint = true;
      }
    }

    // Citizen reports -------------------------------------------------------
    if (visible.reports) {
      for (const report of reports) {
        const element = document.createElement("div");
        element.style.cssText = [
          "width:11px",
          "height:11px",
          "background:#4a5c61",
          "border:2px solid #fff",
          "transform:rotate(45deg)",
          "box-shadow:0 1px 3px rgba(16,33,34,.3)",
          "cursor:pointer",
        ].join(";");
        element.setAttribute("aria-label", `Citizen report at ${report.location_label}`);

        const marker = new maplibregl.Marker({ element })
          .setLngLat([report.longitude, report.latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 14, maxWidth: "300px" }).setHTML(
              reportPopup(report),
            ),
          )
          .addTo(map);

        markersRef.current.push(marker);
        bounds.extend([report.longitude, report.latitude]);
        hasPoint = true;
      }
    }

    // Hotspots (drawn last so they sit on top) ------------------------------
    if (visible.hotspots) {
      for (const hotspot of hotspots) {
        const color = riskColor(hotspot.risk_level);
        // Size encodes severity, so the eye is drawn to the worst first.
        const size = 14 + Math.round((hotspot.risk_score / 100) * 14);

        const element = document.createElement("div");
        element.style.cssText = [
          `width:${size}px`,
          `height:${size}px`,
          "border-radius:50%",
          `background:${color}`,
          "border:2.5px solid #fff",
          `box-shadow:0 0 0 ${Math.round(size / 2)}px ${color}22, 0 2px 6px rgba(16,33,34,.35)`,
          "cursor:pointer",
        ].join(";");
        element.setAttribute("role", "button");
        element.setAttribute("tabindex", "0");
        element.setAttribute(
          "aria-label",
          `Hotspot: ${hotspot.location_label}, risk ${Math.round(hotspot.risk_score)} of 100, ${hotspot.risk_level}`,
        );

        const marker = new maplibregl.Marker({ element })
          .setLngLat([hotspot.longitude, hotspot.latitude])
          .setPopup(
            new maplibregl.Popup({ offset: size / 2 + 6, maxWidth: "300px" }).setHTML(
              hotspotPopup(hotspot),
            ),
          )
          .addTo(map);

        const select = () => selectRef.current?.(hotspot);
        element.addEventListener("click", select);
        element.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            select();
          }
        });

        markersRef.current.push(marker);
        bounds.extend([hotspot.longitude, hotspot.latitude]);
        hasPoint = true;
      }
    }

    if (hasPoint && !bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 64, maxZoom: 12.5, duration: 600 });
    }
  }, [ready, hotspots, reports, stations, visible]);

  const toggle = (key: LayerKey) =>
    setVisible((current) => ({ ...current, [key]: !current[key] }));

  return (
    <div className={cn("map-shell", compact && "is-compact", className)}>
      <div ref={containerRef} className="map-canvas" />

      {!failed ? (
        <>
          <div className="map-controls">
            <button
              type="button"
              className={cn("map-layer-toggle", visible.hotspots && "is-active")}
              onClick={() => toggle("hotspots")}
              aria-pressed={visible.hotspots}
            >
              Hotspots ({hotspots.length})
            </button>
            <button
              type="button"
              className={cn("map-layer-toggle", visible.reports && "is-active")}
              onClick={() => toggle("reports")}
              aria-pressed={visible.reports}
            >
              Reports ({reports.length})
            </button>
            <button
              type="button"
              className={cn("map-layer-toggle", visible.stations && "is-active")}
              onClick={() => toggle("stations")}
              aria-pressed={visible.stations}
            >
              Stations ({stations.length})
            </button>
          </div>

          {wind ? (
            <div className="map-wind">
              <Navigation
                className="map-wind-arrow"
                size={16}
                aria-hidden="true"
                style={{ transform: `rotate(${wind.direction_deg}deg)` }}
              />
              <span>
                <span className="map-wind-value">{wind.speed_ms.toFixed(1)} m/s</span>{" "}
                <span className="map-wind-label">{wind.direction_compass}</span>
              </span>
            </div>
          ) : null}

          <div className="map-legend">
            <p className="map-legend-title">Legend</p>
            <div className="map-legend-items">
              <span className="map-legend-item">
                <span className="map-legend-swatch" style={{ background: "#b3372c" }} />
                Critical hotspot
              </span>
              <span className="map-legend-item">
                <span className="map-legend-swatch" style={{ background: "#c1611c" }} />
                High hotspot
              </span>
              <span className="map-legend-item">
                <span className="map-legend-swatch" style={{ background: "#a86a12" }} />
                Moderate hotspot
              </span>
              <span className="map-legend-item">
                <span className="map-legend-swatch is-station" />
                Monitoring station
              </span>
              <span className="map-legend-item">
                <span className="map-legend-swatch is-report" />
                Citizen report
              </span>
            </div>
          </div>
        </>
      ) : null}

      {failed ? (
        <div className="map-overlay">
          <p className="map-overlay-title">Map could not be displayed</p>
          <p className="map-overlay-text">
            The interactive map needs WebGL and access to the tile provider. Hotspot data is
            still available in the table and detail panels below.
          </p>
        </div>
      ) : !ready ? (
        <div className="map-overlay">
          <span className="spinner" style={{ borderColor: "var(--muted)", borderTopColor: "transparent" }} />
          <p className="map-overlay-text">Loading intelligence map…</p>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Popup templates                                                            */
/* -------------------------------------------------------------------------- */

/** MapLibre popups take raw HTML, so all interpolated text is escaped. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hotspotPopup(hotspot: Hotspot): string {
  const color = riskColor(hotspot.risk_level);
  return `
    <div class="map-popup">
      <div class="map-popup-header">
        <p class="map-popup-title">${escapeHtml(hotspot.location_label)}</p>
        <span class="badge" style="background:${color}1a;color:${color};border-color:${color}44">
          ${escapeHtml(hotspot.risk_level)}
        </span>
      </div>
      <div class="map-popup-body">
        <div class="map-popup-row">
          <span class="map-popup-label">Risk score</span>
          <span class="map-popup-value">${Math.round(hotspot.risk_score)} / 100</span>
        </div>
        <div class="map-popup-row">
          <span class="map-popup-label">Confidence</span>
          <span class="map-popup-value">${Math.round(hotspot.confidence * 100)}%</span>
        </div>
        <div class="map-popup-row">
          <span class="map-popup-label">Likely source</span>
          <span class="map-popup-value">${escapeHtml(titleCase(hotspot.likely_source))}</span>
        </div>
        <div class="map-popup-row">
          <span class="map-popup-label">Signals</span>
          <span class="map-popup-value">${hotspot.signal_count}</span>
        </div>
        <div class="map-popup-row">
          <span class="map-popup-label">Exposed</span>
          <span class="map-popup-value">${formatNumber(hotspot.population_exposed)}</span>
        </div>
        <p class="map-popup-note">
          Detected ${escapeHtml(timeAgo(hotspot.detected_at))} · ${escapeHtml(hotspot.data_mode)} value,
          not a certified measurement.
        </p>
      </div>
    </div>`;
}

function reportPopup(report: Report): string {
  return `
    <div class="map-popup">
      <div class="map-popup-header">
        <p class="map-popup-title">${escapeHtml(report.location_label || "Citizen report")}</p>
        <span class="badge badge-neutral">${escapeHtml(titleCase(report.report_type))}</span>
      </div>
      <div class="map-popup-body">
        ${
          report.pm25 !== null
            ? `<div class="map-popup-row">
                 <span class="map-popup-label">PM2.5 (reported)</span>
                 <span class="map-popup-value">${report.pm25} µg/m³</span>
               </div>`
            : ""
        }
        <div class="map-popup-row">
          <span class="map-popup-label">Status</span>
          <span class="map-popup-value">${escapeHtml(titleCase(report.status))}</span>
        </div>
        <div class="map-popup-row">
          <span class="map-popup-label">Submitted</span>
          <span class="map-popup-value">${escapeHtml(timeAgo(report.created_at))}</span>
        </div>
        <p class="map-popup-note">${escapeHtml(report.description.slice(0, 130))}</p>
      </div>
    </div>`;
}

function stationPopup(station: MonitoringStation): string {
  return `
    <div class="map-popup">
      <div class="map-popup-header">
        <p class="map-popup-title">${escapeHtml(station.name)}</p>
        <span class="badge badge-info">${escapeHtml(station.operator)}</span>
      </div>
      <div class="map-popup-body">
        <div class="map-popup-row">
          <span class="map-popup-label">PM2.5</span>
          <span class="map-popup-value">${station.latest_pm25 ?? "—"} µg/m³</span>
        </div>
        <div class="map-popup-row">
          <span class="map-popup-label">PM10</span>
          <span class="map-popup-value">${station.latest_pm10 ?? "—"} µg/m³</span>
        </div>
        <div class="map-popup-row">
          <span class="map-popup-label">Coverage radius</span>
          <span class="map-popup-value">${station.coverage_radius_km} km</span>
        </div>
        <p class="map-popup-note">
          Reference station · ${escapeHtml(station.data_mode)} data.
        </p>
      </div>
    </div>`;
}
