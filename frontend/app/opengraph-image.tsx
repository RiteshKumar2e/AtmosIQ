import { ImageResponse } from "next/og";

import { APP_TAGLINE } from "@/lib/constants";

/**
 * Social preview card, rendered at build time.
 *
 * Uses the platform's own palette and vocabulary — a risk readout and the
 * coverage-gap premise — rather than a generic logo on a gradient.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "AtmosIQ — Hyperlocal Air Pollution Intelligence";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "68px 72px",
          background: "linear-gradient(140deg, #10201f 0%, #0b3b37 62%, #0f6f66 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "#0f6f66",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            A
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#fff", fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>
              AtmosIQ
            </span>
            <span style={{ color: "#7fd0be", fontSize: 17, letterSpacing: 1.5 }}>
              BRICS CLEAN AIR &amp; CLIMATE RESILIENCE
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span
            style={{
              color: "#fff",
              fontSize: 62,
              fontWeight: 700,
              letterSpacing: -2.4,
              lineHeight: 1.1,
              maxWidth: 900,
            }}
          >
            {APP_TAGLINE}
          </span>
          <span style={{ color: "#9bb0ad", fontSize: 25, lineHeight: 1.45, maxWidth: 860 }}>
            Hyperlocal air pollution intelligence and climate early warning — citizen
            signals, AI analysis and predictive risk in one platform.
          </span>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {/* Capabilities, not readings. A build-time card cannot show live
              values, and inventing them would contradict the provenance
              labelling the rest of the product is built on. */}
          {[
            { label: "Detection", value: "Hyperlocal", color: "#fff" },
            { label: "Analysis", value: "Multimodal AI", color: "#7fd0be" },
            { label: "Forecast", value: "6-hour", color: "#fff" },
            { label: "Regions", value: "36 states", color: "#fff" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: "16px 26px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.14)",
              }}
            >
              <span style={{ color: "#8fa4a1", fontSize: 16, letterSpacing: 1 }}>
                {item.label.toUpperCase()}
              </span>
              <span style={{ color: item.color, fontSize: 30, fontWeight: 700 }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
