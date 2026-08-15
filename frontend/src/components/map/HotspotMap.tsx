"use client";

import {
  LngLatBounds,
  Map as MapLibreMap,
  NavigationControl,
  Popup,
  ScaleControl,
  type GeoJSONSource,
  type LngLatLike,
  type MapMouseEvent,
} from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { buildMapStyle } from "@/components/map/mapStyle";
import type { Corridor, Hotspot, MonitoringStation, Report, Wind } from "@/lib/types";
import { RISK_HEX, cn, eventLabel, timeAgo } from "@/lib/utils";

export interface MapLayerToggles {
  hotspots: boolean;
  reports: boolean;
  stations: boolean;
  corridors: boolean;
  riskZones: boolean;
}

interface HotspotMapProps {
  hotspots: Hotspot[];
  reports?: Report[];
  stations?: MonitoringStation[];
  corridors?: Corridor[];
  wind?: Wind;
  center?: [number, number];
  zoom?: number;
  layers?: Partial<MapLayerToggles>;
  onSelectHotspot?: (hotspot: Hotspot) => void;
  selectedHotspotId?: number | null;
  className?: string;
  /** Fly to fit all hotspots once data arrives. */
  autoFit?: boolean;
}

const DEFAULT_LAYERS: MapLayerToggles = {
  hotspots: true,
  reports: true,
  stations: true,
  corridors: true,
  riskZones: true,
};

export function HotspotMap({
  hotspots,
  reports = [],
  stations = [],
  corridors = [],
  wind,
  center,
  zoom = 9.6,
  layers,
  onSelectHotspot,
  selectedHotspotId,
  className,
  autoFit = true,
}: HotspotMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const hasFitRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const active = useMemo(() => ({ ...DEFAULT_LAYERS, ...layers }), [layers]);

  // Keep the newest click handler without re-registering map listeners.
  const onSelectRef = useRef(onSelectHotspot);
  useEffect(() => {
    onSelectRef.current = onSelectHotspot;
  }, [onSelectHotspot]);

  const resolvedCenter = useMemo<[number, number]>(() => {
    if (center) return center;
    if (hotspots.length > 0) {
      const lat = hotspots.reduce((sum, h) => sum + h.latitude, 0) / hotspots.length;
      const lon = hotspots.reduce((sum, h) => sum + h.longitude, 0) / hotspots.length;
      return [lon, lat];
    }
    return [77.209, 28.6139];
  }, [center, hotspots]);

  /* ---------------------------------------------------------------- init */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: buildMapStyle(),
        center: resolvedCenter as LngLatLike,
        zoom,
        minZoom: 2,
        maxZoom: 17,
        attributionControl: { compact: true },
        // Cooperative gestures keep page scroll usable on touch devices.
        cooperativeGestures: true,
        fadeDuration: 120,
      });
    } catch {
      setFailed(true);
      return;
    }

    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.addControl(
      new ScaleControl({ maxWidth: 90, unit: "metric" }),
      "bottom-left",
    );

    map.on("error", (event) => {
      // A single failed tile must not blank the map.
      if (event?.error && "status" in event.error) return;
    });

    map.on("load", () => {
      registerSourcesAndLayers(map);
      setReady(true);
    });

    mapRef.current = map;

    return () => {
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
      setReady(false);
      hasFitRef.current = false;
    };
    // Intentionally mounted once: subsequent updates flow through setData.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------- popup */
  const openPopup = useCallback((map: MapLibreMap, hotspot: Hotspot) => {
    popupRef.current?.remove();
    const level = hotspot.risk_level;
    const html = `
      <div style="width:270px;font-family:var(--font-sans)">
        <div style="padding:10px 12px;border-bottom:1px solid #e2e6e9;background:${RISK_HEX[level]}0f">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
            <span style="width:7px;height:7px;border-radius:99px;background:${RISK_HEX[level]}"></span>
            <span style="font-size:10px;font-weight:700;letter-spacing:.04em;color:${RISK_HEX[level]}">
              ${level} &middot; ${Math.round(hotspot.risk_score)}/100
            </span>
          </div>
          <div style="font-size:13px;font-weight:600;color:#14181c;line-height:1.3">
            ${escapeHtml(hotspot.location_label)}
          </div>
          <div style="font-size:11px;color:#5b6670;margin-top:2px">
            ${escapeHtml(eventLabel(hotspot.pollution_type))}
          </div>
        </div>
        <div style="padding:10px 12px;font-size:11px;color:#5b6670;line-height:1.5">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;margin-bottom:8px">
            ${statCell("Hotspot probability", `${Math.round(hotspot.hotspot_probability * 100)}%`)}
            ${statCell("Confidence", `${Math.round(hotspot.confidence * 100)}%`)}
            ${statCell("Signals", String(hotspot.signal_count))}
            ${statCell("Exposed", hotspot.population_exposed.toLocaleString())}
            ${statCell("Radius", `${hotspot.radius_km.toFixed(1)} km`)}
            ${statCell("Detected", timeAgo(hotspot.detected_at))}
          </div>
          <div style="border-top:1px solid #e2e6e9;padding-top:7px">
            <div style="font-size:10px;font-weight:600;color:#14181c;margin-bottom:2px">
              Likely source
            </div>
            ${escapeHtml(hotspot.likely_source || "Not determined")}
          </div>
          ${
            hotspot.recommended_action
              ? `<div style="border-top:1px solid #e2e6e9;padding-top:7px;margin-top:7px">
                   <div style="font-size:10px;font-weight:600;color:#14181c;margin-bottom:2px">
                     Recommended intervention
                   </div>
                   ${escapeHtml(hotspot.recommended_action)}
                 </div>`
              : ""
          }
          ${
            hotspot.forecast_note
              ? `<div style="border-top:1px solid #e2e6e9;padding-top:7px;margin-top:7px;color:#2b6cb0">
                   ${escapeHtml(hotspot.forecast_note)}
                 </div>`
              : ""
          }
        </div>
      </div>`;

    popupRef.current = new Popup({
      closeButton: true,
      maxWidth: "290px",
      offset: 14,
    })
      .setLngLat([hotspot.longitude, hotspot.latitude])
      .setHTML(html)
      .addTo(map);
  }, []);

  /* -------------------------------------------------------- interactions */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const handleClick = (event: MapMouseEvent) => {
      const features = map.queryRenderedFeatures(event.point, {
        layers: ["hotspot-core", "hotspot-halo"],
      });
      const feature = features[0];
      if (!feature) return;
      const id = feature.properties?.id as number | undefined;
      const hotspot = hotspots.find((h) => h.id === id);
      if (!hotspot) return;
      openPopup(map, hotspot);
      onSelectRef.current?.(hotspot);
    };

    const setPointer = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const clearPointer = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("click", handleClick);
    map.on("mouseenter", "hotspot-core", setPointer);
    map.on("mouseleave", "hotspot-core", clearPointer);

    return () => {
      map.off("click", handleClick);
      map.off("mouseenter", "hotspot-core", setPointer);
      map.off("mouseleave", "hotspot-core", clearPointer);
    };
  }, [ready, hotspots, openPopup]);

  /* ------------------------------------------------------------ data sync */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    setSource(map, "hotspots", hotspotsToGeoJson(hotspots));
    setSource(map, "reports", reportsToGeoJson(reports));
    setSource(map, "stations", stationsToGeoJson(stations));
    setSource(map, "corridors", corridorsToGeoJson(corridors));

    if (autoFit && !hasFitRef.current && hotspots.length > 1) {
      const bounds = new LngLatBounds();
      hotspots.forEach((h) => bounds.extend([h.longitude, h.latitude]));
      reports.slice(0, 40).forEach((r) => bounds.extend([r.longitude, r.latitude]));
      map.fitBounds(bounds, { padding: 64, maxZoom: 12, duration: 700 });
      hasFitRef.current = true;
    }
  }, [ready, hotspots, reports, stations, corridors, autoFit]);

  /* ------------------------------------------------------ layer toggles */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const visibility = (on: boolean) => (on ? "visible" : "none");
    setVisible(map, ["hotspot-core", "hotspot-label"], visibility(active.hotspots));
    setVisible(map, ["hotspot-halo"], visibility(active.hotspots && active.riskZones));
    setVisible(map, ["report-points"], visibility(active.reports));
    setVisible(map, ["station-points", "station-coverage"], visibility(active.stations));
    setVisible(map, ["corridor-lines"], visibility(active.corridors));
  }, [ready, active]);

  /* ------------------------------------------- externally selected hotspot */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || selectedHotspotId == null) return;
    const hotspot = hotspots.find((h) => h.id === selectedHotspotId);
    if (!hotspot) return;
    map.flyTo({ center: [hotspot.longitude, hotspot.latitude], zoom: Math.max(map.getZoom(), 12), duration: 800 });
    openPopup(map, hotspot);
  }, [selectedHotspotId, ready, hotspots, openPopup]);

  if (failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-sunken)] p-6 text-center",
          className,
        )}
      >
        <div>
          <p className="text-sm font-medium text-[var(--color-ink)]">Map could not be initialised</p>
          <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
            Your browser may not support WebGL. Hotspot data is still available in the list views.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div
        ref={containerRef}
        className="h-full w-full overflow-hidden rounded-[var(--radius-card)]"
        role="application"
        aria-label="Interactive pollution intelligence map showing hotspots, citizen reports, and monitoring stations"
      />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center rounded-[var(--radius-card)] bg-[var(--color-surface-sunken)]">
          <div className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-line-strong)] border-t-[var(--color-brand-500)]" />
            Loading map...
          </div>
        </div>
      )}

      {ready && wind && (
        <div className="pointer-events-none absolute bottom-8 right-2 rounded-md border border-[var(--color-line)] bg-white/92 px-2.5 py-1.5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden>
              <g transform={`rotate(${(wind.direction_deg + 180) % 360} 12 12)`}>
                <path d="M12 3 L12 21 M12 3 L8 8 M12 3 L16 8" stroke="#285d59" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </g>
            </svg>
            <span className="text-[10px] font-medium tabular text-[var(--color-ink)]">
              {wind.speed_ms.toFixed(1)} m/s
            </span>
            <span className="text-[10px] text-[var(--color-ink-muted)]">from {wind.direction_compass}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   Layer registration
   ========================================================================== */
function emptyCollection(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

function registerSourcesAndLayers(map: MapLibreMap) {
  for (const id of ["hotspots", "reports", "stations", "corridors"]) {
    map.addSource(id, { type: "geojson", data: emptyCollection() });
  }

  // --- Monitoring station coverage discs (drawn first, sit underneath) ---
  map.addLayer({
    id: "station-coverage",
    type: "circle",
    source: "stations",
    paint: {
      "circle-radius": [
        "interpolate", ["exponential", 2], ["zoom"],
        8, ["/", ["get", "coverage_radius_km"], 1.4],
        14, ["*", ["get", "coverage_radius_km"], 12],
      ],
      "circle-color": "#2b6cb0",
      "circle-opacity": 0.055,
      "circle-stroke-width": 1,
      "circle-stroke-color": "#2b6cb0",
      "circle-stroke-opacity": 0.22,
    },
  });

  // --- Downwind transport corridors ---
  map.addLayer({
    id: "corridor-lines",
    type: "line",
    source: "corridors",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": ["get", "color"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1.5, 14, 3.5],
      "line-opacity": 0.5,
      "line-dasharray": [2, 1.6],
    },
  });


  // --- Risk zone halo (the affected radius) ---
  map.addLayer({
    id: "hotspot-halo",
    type: "circle",
    source: "hotspots",
    paint: {
      "circle-radius": [
        "interpolate", ["exponential", 2], ["zoom"],
        8, ["/", ["get", "radius_km"], 1.1],
        14, ["*", ["get", "radius_km"], 15],
      ],
      "circle-color": ["get", "color"],
      "circle-opacity": 0.13,
      "circle-stroke-width": 1,
      "circle-stroke-color": ["get", "color"],
      "circle-stroke-opacity": 0.34,
    },
  });

  // --- Citizen report points ---
  map.addLayer({
    id: "report-points",
    type: "circle",
    source: "reports",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 2.6, 14, 5],
      "circle-color": "#34756f",
      "circle-opacity": 0.75,
      "circle-stroke-width": 1,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-opacity": 0.9,
    },
  });

  // --- Monitoring stations ---
  // Circle rather than a glyph symbol: circles are rendered by the GPU with
  // no font dependency, so stations always draw even if the glyph endpoint is
  // unreachable. Squared-off styling distinguishes them from citizen signals.
  map.addLayer({
    id: "station-points",
    type: "circle",
    source: "stations",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 3.4, 14, 6.5],
      "circle-color": "#ffffff",
      "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 8, 2, 14, 3],
      "circle-stroke-color": "#2b6cb0",
    },
  });

  // --- Hotspot cores (topmost, clickable) ---
  map.addLayer({
    id: "hotspot-core",
    type: "circle",
    source: "hotspots",
    paint: {
      "circle-radius": [
        "interpolate", ["linear"], ["zoom"],
        8, ["+", 4, ["*", ["get", "intensity"], 3]],
        14, ["+", 8, ["*", ["get", "intensity"], 7]],
      ],
      "circle-color": ["get", "color"],
      "circle-opacity": 0.92,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  });

  map.addLayer({
    id: "hotspot-label",
    type: "symbol",
    source: "hotspots",
    layout: {
      "text-field": ["get", "score"],
      "text-size": 10,
      "text-offset": [0, 0.06],
      "text-allow-overlap": true,
      "text-font": ["Open Sans Regular"],
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": ["get", "color"],
      "text-halo-width": 0.6,
    },
  });
}

function setSource(map: MapLibreMap, id: string, data: GeoJSON.FeatureCollection) {
  const source = map.getSource(id) as GeoJSONSource | undefined;
  source?.setData(data);
}

function setVisible(map: MapLibreMap, ids: string[], visibility: "visible" | "none") {
  for (const id of ids) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visibility);
  }
}

/* ==========================================================================
   GeoJSON builders
   ========================================================================== */
function hotspotsToGeoJson(hotspots: Hotspot[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: hotspots.map((h) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [h.longitude, h.latitude] },
      properties: {
        id: h.id,
        color: RISK_HEX[h.risk_level],
        score: String(Math.round(h.risk_score)),
        // Normalised 0-1 severity drives marker size, so the eye reads
        // magnitude before it reads colour.
        intensity: Math.max(0.15, Math.min(1, (h.risk_score - 30) / 70)),
        radius_km: h.radius_km,
      },
    })),
  };
}

function reportsToGeoJson(reports: Report[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: reports.map((r) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [r.longitude, r.latitude] },
      properties: { id: r.id, label: r.location_label },
    })),
  };
}

function stationsToGeoJson(stations: MonitoringStation[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: stations.map((s) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [s.longitude, s.latitude] },
      properties: {
        id: s.id,
        name: s.name,
        coverage_radius_km: s.coverage_radius_km,
      },
    })),
  };
}

function corridorsToGeoJson(corridors: Corridor[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: corridors.map((c) => ({
      type: "Feature",
      geometry: { type: "LineString", coordinates: c.coordinates },
      properties: {
        hotspot_id: c.hotspot_id,
        color: RISK_HEX[c.risk_level],
      },
    })),
  };
}

function statCell(label: string, value: string): string {
  return `<div>
    <div style="font-size:9px;text-transform:uppercase;letter-spacing:.03em;color:#838f99">${label}</div>
    <div style="font-size:12px;font-weight:600;color:#14181c;font-variant-numeric:tabular-nums">${value}</div>
  </div>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ==========================================================================
   Legend - rendered alongside the map by consumers
   ========================================================================== */
export function MapLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px]", className)}>
      <span className="font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
        Legend
      </span>
      {(["LOW", "MODERATE", "HIGH", "CRITICAL"] as const).map((level) => (
        <span key={level} className="inline-flex items-center gap-1 text-[var(--color-ink-muted)]">
          <span
            className="h-2 w-2 rounded-full ring-1 ring-white"
            style={{ backgroundColor: RISK_HEX[level] }}
            aria-hidden
          />
          {level}
        </span>
      ))}
      <span className="inline-flex items-center gap-1 text-[var(--color-ink-muted)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-500)]" aria-hidden />
        Citizen signal
      </span>
      <span className="inline-flex items-center gap-1 text-[var(--color-ink-muted)]">
        <span
          className="h-2 w-2 rounded-full border-2 border-[var(--color-info)] bg-white"
          aria-hidden
        />
        Monitoring station
      </span>
      <span className="inline-flex items-center gap-1 text-[var(--color-ink-muted)]">
        <span
          className="h-0 w-4 border-t-2 border-dashed border-[var(--color-ink-subtle)]"
          aria-hidden
        />
        Downwind corridor (modelled)
      </span>
    </div>
  );
}
