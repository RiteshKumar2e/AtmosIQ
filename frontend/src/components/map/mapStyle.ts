import type { StyleSpecification } from "maplibre-gl";

/**
 * Basemap style.
 *
 * Deliberately built around CARTO's public raster basemap rather than a
 * vector provider: it needs no API key, works in every BRICS geography, and
 * renders street-level detail immediately. That keeps the prototype runnable
 * by anyone who clones the repository — a judge should not need to register
 * for a mapping account to see the map.
 *
 * Set NEXT_PUBLIC_MAP_STYLE_URL to override with any MapLibre style
 * (MapTiler, Protomaps, a self-hosted tile server) for a production
 * deployment; nothing else in the map code changes.
 */

const CARTO_LIGHT = [
  "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{ratio}.png",
  "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{ratio}.png",
  "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{ratio}.png",
];

const ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a> contributors, ' +
  '<a href="https://carto.com/attributions" target="_blank" rel="noreferrer">© CARTO</a>';

export function buildMapStyle(): StyleSpecification | string {
  const override = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
  if (override) return override;

  // Request @2x tiles on high-DPI screens so labels stay crisp.
  const ratio =
    typeof window !== "undefined" && window.devicePixelRatio > 1.25 ? "@2x" : "";

  return {
    version: 8,
    // Required for any symbol/text layer. A raster basemap ships no glyphs of
    // its own, so without this the hotspot score labels would silently fail to
    // draw. If the endpoint is unreachable only the labels are lost — every
    // other layer still renders.
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      basemap: {
        type: "raster",
        tiles: CARTO_LIGHT.map((url) => url.replace("{ratio}", ratio)),
        tileSize: 256,
        attribution: ATTRIBUTION,
        maxzoom: 20,
      },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": "#f1f3f4" },
      },
      {
        id: "basemap",
        type: "raster",
        source: "basemap",
        paint: {
          // Slightly desaturated so the risk overlay stays the loudest thing
          // on screen — the map is context, the data is the subject.
          "raster-saturation": -0.32,
          "raster-contrast": -0.04,
          "raster-brightness-min": 0.05,
        },
      },
    ],
  };
}
