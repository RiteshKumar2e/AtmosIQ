import { Activity, Radio } from "lucide-react";

import { DataBadge } from "@/components/dashboard/shared";

/**
 * Hero visual: a condensed environmental intelligence console.
 *
 * Deliberately built from the platform's own vocabulary — a monitoring map with
 * a coverage gap, live risk readouts, incoming citizen signals and a forecast
 * trace — rather than a generic AI illustration. Everything is inline SVG, so
 * it renders on the server with no image request and no layout shift.
 *
 * All figures shown here are static demonstration values and are labelled as
 * such in the panel footer.
 */

const SIGNALS = [
  { label: "Citizen report · Bawana Industrial Area", time: "2m", color: "var(--risk-critical)" },
  { label: "Station reading · Anand Vihar", time: "6m", color: "var(--information)" },
  { label: "Citizen report · Mundka worksite", time: "11m", color: "var(--risk-high)" },
  { label: "Hotspot confirmed · Ghazipur", time: "18m", color: "var(--risk-critical)" },
];

export function HeroVisual() {
  return (
    <div className="hero-visual">
      <div className="hero-panel">
        <div className="hero-panel-header">
          <span className="hero-panel-title">
            <Activity size={15} aria-hidden="true" style={{ color: "var(--primary)" }} />
            Pollution Intelligence
          </span>
          <DataBadge mode="SIMULATED" />
        </div>

        <div className="hero-panel-body">
          {/* Map ------------------------------------------------------------ */}
          <div className="hero-map">
            <svg viewBox="0 0 420 210" role="img" aria-label="Regional monitoring map showing three detected pollution hotspots and a coverage gap between fixed stations">
              <defs>
                <radialGradient id="hotspot-critical" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="#b3372c" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#b3372c" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="hotspot-high" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="#c1611c" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#c1611c" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="hotspot-moderate" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="#a86a12" stopOpacity="0.34" />
                  <stop offset="100%" stopColor="#a86a12" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Base terrain */}
              <rect width="420" height="210" fill="#eef3f2" />

              {/* District boundaries */}
              <g stroke="#d3dedc" strokeWidth="1" fill="#e6eeec">
                <path d="M12 18 L140 10 L168 74 L96 118 L20 96 Z" />
                <path d="M140 10 L286 22 L300 88 L168 74 Z" />
                <path d="M286 22 L408 16 L404 96 L300 88 Z" />
                <path d="M20 96 L96 118 L110 194 L26 198 Z" />
                <path d="M96 118 L168 74 L300 88 L286 176 L110 194 Z" />
                <path d="M300 88 L404 96 L400 190 L286 176 Z" />
              </g>

              {/* River corridor */}
              <path
                d="M40 4 C 120 60, 150 92, 210 118 S 320 176, 356 206"
                stroke="#c5dbe4"
                strokeWidth="5"
                fill="none"
                strokeLinecap="round"
              />

              {/* Coverage radius of fixed monitoring stations */}
              <g fill="#1c6394" fillOpacity="0.07" stroke="#1c6394" strokeOpacity="0.22" strokeDasharray="3 3">
                <circle cx="86" cy="60" r="46" />
                <circle cx="330" cy="150" r="44" />
              </g>

              {/* Hotspot plumes */}
              <circle cx="238" cy="52" r="52" fill="url(#hotspot-critical)" />
              <circle cx="150" cy="152" r="46" fill="url(#hotspot-high)" />
              <circle cx="352" cy="60" r="38" fill="url(#hotspot-moderate)" />

              {/* Pulsing detection rings */}
              <circle cx="238" cy="52" r="8" fill="none" stroke="#b3372c" strokeWidth="1.5" className="hotspot-pulse" />
              <circle
                cx="150"
                cy="152"
                r="8"
                fill="none"
                stroke="#c1611c"
                strokeWidth="1.5"
                className="hotspot-pulse"
                style={{ animationDelay: "1.1s" }}
              />

              {/* Hotspot cores */}
              <g stroke="#fff" strokeWidth="2">
                <circle cx="238" cy="52" r="7.5" fill="#b3372c" />
                <circle cx="150" cy="152" r="7" fill="#c1611c" />
                <circle cx="352" cy="60" r="6" fill="#a86a12" />
              </g>

              {/* Fixed monitoring stations */}
              <g fill="#1c6394" stroke="#fff" strokeWidth="1.5">
                <rect x="81" y="55" width="11" height="11" rx="2" />
                <rect x="325" y="145" width="11" height="11" rx="2" />
                <rect x="196" y="176" width="11" height="11" rx="2" />
              </g>

              {/* Citizen reports */}
              <g fill="#4a5c61" stroke="#fff" strokeWidth="1.2">
                <rect x="252" y="76" width="7" height="7" rx="1.5" transform="rotate(45 255.5 79.5)" />
                <rect x="214" y="34" width="7" height="7" rx="1.5" transform="rotate(45 217.5 37.5)" />
                <rect x="130" y="170" width="7" height="7" rx="1.5" transform="rotate(45 133.5 173.5)" />
                <rect x="172" y="136" width="7" height="7" rx="1.5" transform="rotate(45 175.5 139.5)" />
                <rect x="368" y="44" width="7" height="7" rx="1.5" transform="rotate(45 371.5 47.5)" />
              </g>

              {/* Coverage gap annotation — the platform's core premise */}
              <g>
                <line x1="238" y1="52" x2="196" y2="20" stroke="#b3372c" strokeWidth="1" strokeDasharray="3 2" />
                <rect x="150" y="6" width="98" height="17" rx="4" fill="#fff" stroke="#f1c9c5" />
                <text x="199" y="18" textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#b3372c" fontFamily="var(--font-sans)">
                  Coverage gap
                </text>
              </g>
            </svg>
          </div>

          {/* Readouts ------------------------------------------------------- */}
          <div className="hero-readouts">
            <div className="hero-readout">
              <p className="hero-readout-label">Air Risk</p>
              <p className="hero-readout-value" style={{ color: "var(--risk-high)" }}>
                72<span style={{ fontSize: "var(--text-sm)", color: "var(--muted)" }}>/100</span>
              </p>
            </div>
            <div className="hero-readout">
              <p className="hero-readout-label">Hotspots</p>
              <p className="hero-readout-value">12</p>
            </div>
            <div className="hero-readout">
              <p className="hero-readout-label">Confidence</p>
              <p className="hero-readout-value">86%</p>
            </div>
          </div>

          {/* Forecast ------------------------------------------------------- */}
          <div className="hero-forecast" style={{ marginBottom: 14 }}>
            <div className="hero-forecast-head">
              <span>6-hour risk forecast</span>
              <span style={{ color: "var(--risk-critical)", fontWeight: 700 }}>Peak 84 · 21:00</span>
            </div>
            <svg viewBox="0 0 300 56" height="56" width="100%" role="img" aria-label="Forecast line rising from a risk of 72 now to a peak of 84 in six hours">
              <defs>
                <linearGradient id="forecast-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f6f66" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#0f6f66" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Confidence band */}
              <path
                d="M4 30 L64 26 L124 20 L184 13 L244 9 L296 12 L296 26 L244 23 L184 27 L124 33 L64 38 L4 40 Z"
                fill="#0f6f66"
                fillOpacity="0.1"
              />
              <path d="M4 35 L64 32 L124 26 L184 20 L244 16 L296 19 L296 56 L4 56 Z" fill="url(#forecast-fill)" />
              <polyline
                points="4,35 64,32 124,26 184,20 244,16 296,19"
                fill="none"
                stroke="#0f6f66"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="244" cy="16" r="3.5" fill="#b3372c" stroke="#fff" strokeWidth="1.5" />
            </svg>
          </div>

          {/* Signal feed ---------------------------------------------------- */}
          <div>
            <div className="hero-forecast-head" style={{ marginBottom: 2 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Radio size={12} aria-hidden="true" />
                Incoming signals
              </span>
            </div>
            {SIGNALS.map((signal) => (
              <div className="hero-signal-row" key={signal.label}>
                <span
                  className="hero-signal-dot"
                  style={{ background: signal.color }}
                  aria-hidden="true"
                />
                <span className="hero-signal-label">{signal.label}</span>
                <span className="hero-signal-time">{signal.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
