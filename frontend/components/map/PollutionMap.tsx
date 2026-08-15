"use client";

import L from "leaflet";
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
 * Built on Leaflet: raster tiles are plain <img> elements, so the map renders
 * without WebGL and degrades visibly (rather than to a blank canvas) if the
 * tile host is unreachable.
 *
 * Markers are `divIcon`s styled from the design system, which also sidesteps
 * Leaflet's broken default-icon asset paths under a bundler.
 */

const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

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
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupsRef = useRef<Record<LayerKey, L.LayerGroup | null>>({
    hotspots: null,
    reports: null,
    stations: null,
  });

  const [ready, setReady] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [visible, setVisible] = useState<Record<LayerKey, boolean>>({
    hotspots: true,
    reports: true,
    stations: true,
  });

  // Keep the latest callback without re-running the marker effect every render.
  const selectRef = useRef(onSelectHotspot);
  selectRef.current = onSelectHotspot;

  const tileUrl = useMemo(() => MAP_STYLE_URL || OSM_TILES, []);

  /* ---------------------------------------------------------------------- */
  /* Initialise the map once                                                */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [DEFAULT_MAP_CENTER[1], DEFAULT_MAP_CENTER[0]], // Leaflet is [lat, lng]
      zoom: compact ? DEFAULT_MAP_ZOOM - 0.8 : DEFAULT_MAP_ZOOM,
      zoomControl: false,
      scrollWheelZoom: true,
      attributionControl: true,
    });

    L.control.zoom({ position: "topright" }).addTo(map);

    const tiles = L.tileLayer(tileUrl, {
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
      crossOrigin: true,
    });

    tiles.on("tileerror", () => setTileError(true));
    tiles.addTo(map);

    layerGroupsRef.current = {
      hotspots: L.layerGroup().addTo(map),
      reports: L.layerGroup().addTo(map),
      stations: L.layerGroup().addTo(map),
    };

    mapRef.current = map;
    setReady(true);

    // The card animates in, so the container can be measured before it has its
    // final size. Without this the tile grid renders into the wrong viewport.
    const invalidate = () => map.invalidateSize();
    const raf = requestAnimationFrame(invalidate);
    const timer = window.setTimeout(invalidate, 250);

    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(invalidate) : null;
    if (observer && containerRef.current) observer.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      observer?.disconnect();
      map.remove();
      mapRef.current = null;
      layerGroupsRef.current = { hotspots: null, reports: null, stations: null };
    };
  }, [tileUrl, compact]);

  /* ---------------------------------------------------------------------- */
  /* Render markers whenever the data changes                               */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    const map = mapRef.current;
    const groups = layerGroupsRef.current;
    if (!map || !ready || !groups.hotspots || !groups.reports || !groups.stations) return;

    groups.hotspots.clearLayers();
    groups.reports.clearLayers();
    groups.stations.clearLayers();

    const bounds = L.latLngBounds([]);

    // Monitoring stations ---------------------------------------------------
    for (const station of stations) {
      L.marker([station.latitude, station.longitude], {
        icon: L.divIcon({
          className: "map-pin-wrapper",
          html: '<span class="map-pin map-pin-station"></span>',
          iconSize: [13, 13],
          iconAnchor: [6.5, 6.5],
        }),
        alt: `Monitoring station: ${station.name}`,
      })
        .bindPopup(stationPopup(station), { maxWidth: 300 })
        .addTo(groups.stations);

      bounds.extend([station.latitude, station.longitude]);
    }

    // Citizen reports -------------------------------------------------------
    for (const report of reports) {
      L.marker([report.latitude, report.longitude], {
        icon: L.divIcon({
          className: "map-pin-wrapper",
          html: '<span class="map-pin map-pin-report"></span>',
          iconSize: [11, 11],
          iconAnchor: [5.5, 5.5],
        }),
        alt: `Citizen report at ${report.location_label}`,
      })
        .bindPopup(reportPopup(report), { maxWidth: 300 })
        .addTo(groups.reports);

      bounds.extend([report.latitude, report.longitude]);
    }

    // Hotspots (added last so they sit on top) ------------------------------
    for (const hotspot of hotspots) {
      const color = riskColor(hotspot.risk_level);
      // Size encodes severity, so the eye is drawn to the worst first.
      const size = 14 + Math.round((hotspot.risk_score / 100) * 14);

      // Affected radius, drawn in real metres so it scales with zoom.
      L.circle([hotspot.latitude, hotspot.longitude], {
        radius: (hotspot.radius_km || 1) * 1000,
        color,
        weight: 1,
        opacity: 0.45,
        fillColor: color,
        fillOpacity: 0.12,
        interactive: false,
      }).addTo(groups.hotspots);

      const marker = L.marker([hotspot.latitude, hotspot.longitude], {
        icon: L.divIcon({
          className: "map-pin-wrapper",
          html: `<span class="map-pin map-pin-hotspot" style="--pin-size:${size}px;--pin-color:${color}"></span>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        }),
        alt: `Hotspot: ${hotspot.location_label}, risk ${Math.round(
          hotspot.risk_score,
        )} of 100, ${hotspot.risk_level}`,
        keyboard: true,
        riseOnHover: true,
      })
        .bindPopup(hotspotPopup(hotspot), { maxWidth: 300 })
        .addTo(groups.hotspots);

      marker.on("click", () => selectRef.current?.(hotspot));
      marker.on("keypress", () => selectRef.current?.(hotspot));

      bounds.extend([hotspot.latitude, hotspot.longitude]);
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [56, 56], maxZoom: 12.5 });
    }
  }, [ready, hotspots, reports, stations]);

  /* ---------------------------------------------------------------------- */
  /* Layer visibility                                                       */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    const map = mapRef.current;
    const groups = layerGroupsRef.current;
    if (!map || !ready) return;

    (Object.keys(groups) as LayerKey[]).forEach((key) => {
      const group = groups[key];
      if (!group) return;
      if (visible[key]) {
        if (!map.hasLayer(group)) group.addTo(map);
      } else if (map.hasLayer(group)) {
        map.removeLayer(group);
      }
    });
  }, [visible, ready]);

  const toggle = (key: LayerKey) =>
    setVisible((current) => ({ ...current, [key]: !current[key] }));

  return (
    <div className={cn("map-shell", compact && "is-compact", className)}>
      <div ref={containerRef} className="map-canvas" />

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

      {tileError ? (
        <div className="map-tile-warning" role="status">
          Map tiles could not be loaded. Markers below are still positioned correctly.
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Popup templates                                                            */
/* -------------------------------------------------------------------------- */

/** Leaflet popups take raw HTML, so all interpolated text is escaped. */
function escapeHtml(value: string): string {
  return String(value)
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
          Detected ${escapeHtml(timeAgo(hotspot.detected_at))} · ${escapeHtml(
            hotspot.data_mode,
          )} value, not a certified measurement.
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
