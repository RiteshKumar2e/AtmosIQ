import {
  ArrowRight,
  BellRing,
  BrainCircuit,
  Cpu,
  Database,
  Gauge,
  Layers,
  MapPinned,
  Monitor,
  Server,
  ShieldCheck,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react";
import type { Metadata } from "next";

import { DataBadge } from "@/components/dashboard/shared";
import { PublicShell } from "@/components/navigation/PublicShell";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "The complete AtmosIQ pipeline, from a citizen signal through Gemini analysis, data fusion, risk scoring, hotspot detection and forecasting to an authority alert and recommended action.",
};

const PIPELINE = [
  {
    number: "01",
    icon: Users,
    title: "Citizen Signal",
    text: "A resident submits an observation: a photograph, a written description, a geolocated position and optionally handheld sensor values. This is the only stage that requires a human, and it is deliberately fast enough to complete from the roadside.",
    details: [
      "Multipart submission so the image travels with the report in one request",
      "Coordinates validated server-side before anything is persisted",
      "Works with or without an image — confidence is lowered when none is supplied",
      "Attributed to the submitting account for follow-up and accountability",
    ],
    badge: "LIVE",
  },
  {
    number: "02",
    icon: BrainCircuit,
    title: "AI Analysis",
    text: "Google Gemini performs multimodal analysis of the image and description together, returning structured JSON rather than prose. The prompt forbids inferring any numeric air-quality value from a photograph, and the response is re-validated and clamped before it is trusted.",
    details: [
      "Event type classified into a fixed, known vocabulary",
      "Visible indicators extracted strictly from what the image shows",
      "Visual severity kept separate from instrument measurements",
      "Falls back to a deterministic local analyser if the API is unavailable",
    ],
    badge: "AI ASSESSMENT",
  },
  {
    number: "03",
    icon: Database,
    title: "Environmental Data Fusion",
    text: "The visual assessment alone is not enough to act on. AtmosIQ pulls measured context for the same coordinates — nearby reference station readings, current meteorology, and the historical baseline for that location — so the assessment can be corroborated or contradicted.",
    details: [
      "Reference station PM2.5 and PM10 within the surrounding area",
      "Live wind speed, direction and humidity from the meteorology provider",
      "Historical pollution records for the same region and season",
      "Independent citizen reports nearby that corroborate the signal",
    ],
    badge: "LIVE",
  },
  {
    number: "04",
    icon: Gauge,
    title: "Risk Engine",
    text: "A transparent weighted engine fuses every evidence stream into a 0-100 risk score with a risk band, a hotspot probability and a calibrated confidence value. Crucially, it also emits the individual weighted contributions, so the number can be interrogated rather than merely accepted.",
    details: [
      "Pollutant sub-index derived from measured concentrations",
      "Dispersion modifier from wind, humidity and temperature",
      "Diurnal adjustment for boundary-layer height and traffic peaks",
      "Corroboration bonus scaled by the number of independent signals",
    ],
    badge: "MODELLED",
  },
  {
    number: "05",
    icon: MapPinned,
    title: "Hotspot Detection",
    text: "Where the score and probability clear threshold, the event is promoted to a hotspot: a geographic cluster with a centroid, an affected radius, an exposed population estimate and a running signal count. Nearby signals merge into an existing hotspot rather than creating duplicates.",
    details: [
      "Spatial clustering of signals within a proximity radius",
      "Radius scaled to the severity of the detected event",
      "Signal count and confidence updated as corroboration arrives",
      "Status tracked from active through monitoring to resolved",
    ],
    badge: "MODELLED",
  },
  {
    number: "06",
    icon: TrendingUp,
    title: "Forecast",
    text: "A six-hour projection is generated from the current risk using a persistence baseline, the diurnal boundary-layer cycle and wind dispersion. Uncertainty widens with lead time and is published as an explicit confidence band, never hidden behind a single line.",
    details: [
      "Hour-by-hour risk with upper and lower bounds",
      "Peak risk and the time it is expected to occur",
      "Contributing factors disclosed alongside the projection",
      "Labelled a statistical projection, not a chemical transport model",
    ],
    badge: "MODELLED",
  },
  {
    number: "07",
    icon: BellRing,
    title: "Authority Alert",
    text: "A ranked alert is raised for the responsible authority, carrying the severity band, the location, the driving risk score and the forecast direction. The alert has a lifecycle — acknowledged, assigned, resolved — so accountability is recorded rather than assumed.",
    details: [
      "Severity derived from the fused risk score, not from report volume",
      "Assignment to a named responding unit",
      "Full status history retained for audit",
      "Filterable queue so the most severe event surfaces first",
    ],
    badge: "MODELLED",
  },
  {
    number: "08",
    icon: ShieldCheck,
    title: "Recommended Action",
    text: "Every alert closes with a concrete operational recommendation matched to the severity band — an inspection window, a verification step, a public advisory — so the platform hands over a decision to make rather than a number to interpret.",
    details: [
      "Action scaled to severity, from watchlist to immediate dispatch",
      "Names the likely source so the team knows what to inspect",
      "Framed as decision support for a human decision-maker",
      "Never issues an autonomous enforcement or policy decision",
    ],
    badge: "AI ASSESSMENT",
  },
];

const ARCHITECTURE = [
  {
    icon: Monitor,
    title: "Frontend",
    subtitle: "Next.js App Router",
    items: [
      { label: "React 19 with TypeScript", code: null },
      { label: "TanStack Query for server state", code: null },
      { label: "MapLibre GL for the intelligence map", code: null },
      { label: "Recharts for trend and forecast visualisation", code: null },
      { label: "React Hook Form with Zod validation", code: null },
    ],
  },
  {
    icon: Server,
    title: "Backend",
    subtitle: "FastAPI",
    items: [
      { label: "REST API documented at", code: "/docs" },
      { label: "JWT authentication with role-based access", code: null },
      { label: "SQLAlchemy ORM over SQLite", code: null },
      { label: "Multipart image intake with validation", code: null },
      { label: "Consistent JSON error envelope", code: null },
    ],
  },
  {
    icon: Cpu,
    title: "Intelligence",
    subtitle: "AI and modelling",
    items: [
      { label: "Google Gemini multimodal analysis", code: null },
      { label: "Weighted risk engine with contributions", code: null },
      { label: "Forecast engine with confidence bands", code: null },
      { label: "Meteorology provider with offline fallback", code: null },
      { label: "Deterministic demo analyser when offline", code: null },
    ],
  },
];

const DATAFLOW = [
  { label: "Citizen", meta: "browser" },
  { label: "FastAPI", meta: "POST /api/reports" },
  { label: "Gemini", meta: "multimodal" },
  { label: "Risk Engine", meta: "weighted fusion" },
  { label: "Hotspot", meta: "clustered" },
  { label: "Alert", meta: "authority" },
];

const GUARANTEES = [
  {
    icon: ShieldCheck,
    title: "Provenance on every value",
    text: "Each figure returned by the API carries a data mode, so nothing synthetic can be mistaken for a certified measurement.",
  },
  {
    icon: BrainCircuit,
    title: "Structured AI output",
    text: "Gemini returns validated JSON against a fixed schema. Free-form model prose never reaches the interface unchecked.",
  },
  {
    icon: Layers,
    title: "Graceful degradation",
    text: "If the AI provider or meteorology service is unreachable, the platform continues to function with clearly labelled fallbacks.",
  },
  {
    icon: Workflow,
    title: "Explainable by construction",
    text: "The risk engine emits its weighted contributions with every score, so no output is a black box to the officer acting on it.",
  },
];

export default function HowItWorksPage() {
  return (
    <PublicShell>
      <section className="page-hero">
        <div className="container page-hero-inner">
          <p className="eyebrow">
            <Workflow size={13} aria-hidden="true" />
            How It Works
          </p>
          <h1>From a photograph on a phone to an alert on a desk.</h1>
          <p className="page-hero-lead">
            Eight stages, each adding evidence the previous stage could not supply. Nothing in
            this pipeline is decorative — every step changes the score, the confidence, or the
            action that follows.
          </p>
        </div>
      </section>

      {/* Pipeline ---------------------------------------------------------- */}
      <section className="section">
        <div className="container">
          <div className="hiw-pipeline">
            {PIPELINE.map((stage) => (
              <article className="hiw-step" key={stage.number}>
                <div className="hiw-step-number">
                  <stage.icon className="hiw-step-number-icon" size={19} aria-hidden="true" />
                  <span className="hiw-step-number-value">{stage.number}</span>
                </div>

                <div className="hiw-step-body">
                  <h2 className="hiw-step-title">
                    {stage.number} — {stage.title}
                  </h2>
                  <p className="hiw-step-text">{stage.text}</p>

                  <div className="hiw-step-detail">
                    {stage.details.map((detail) => (
                      <div className="hiw-detail-item" key={detail}>
                        <ArrowRight size={14} aria-hidden="true" />
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>

                  <div className="hiw-step-meta">
                    <DataBadge mode={stage.badge} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Data flow --------------------------------------------------------- */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header centered">
            <h2>Request path</h2>
            <p className="section-lead">
              A single submission traverses the whole system in one request cycle.
            </p>
          </div>

          <div className="dataflow">
            <div className="dataflow-track">
              {DATAFLOW.map((node, index) => (
                <div key={node.label} style={{ display: "contents" }}>
                  <div className="dataflow-node">
                    <p className="dataflow-node-label">{node.label}</p>
                    <p className="dataflow-node-meta">{node.meta}</p>
                  </div>
                  {index < DATAFLOW.length - 1 ? (
                    <span className="dataflow-arrow" aria-hidden="true">
                      <ArrowRight size={17} />
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Architecture ------------------------------------------------------ */}
      <section className="section">
        <div className="container">
          <div className="section-header centered">
            <h2>Technical architecture</h2>
            <p className="section-lead">
              Two applications, one API contract, no unnecessary services.
            </p>
          </div>

          <div className="hiw-architecture-grid">
            {ARCHITECTURE.map((layer) => (
              <article className="arch-layer" key={layer.title}>
                <div className="arch-layer-head">
                  <span className="arch-layer-icon" aria-hidden="true">
                    <layer.icon size={19} />
                  </span>
                  <div>
                    <h3 className="arch-layer-title">{layer.title}</h3>
                    <p className="arch-layer-subtitle">{layer.subtitle}</p>
                  </div>
                </div>

                <div className="arch-items">
                  {layer.items.map((item) => (
                    <div className="arch-item" key={item.label}>
                      <span className="arch-item-dot" aria-hidden="true" />
                      <span>
                        {item.label} {item.code ? <code>{item.code}</code> : null}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Guarantees -------------------------------------------------------- */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header centered">
            <h2>Engineering guarantees</h2>
          </div>

          <div className="guarantee-grid">
            {GUARANTEES.map((item) => (
              <article className="guarantee-card" key={item.title}>
                <span className="guarantee-icon" aria-hidden="true">
                  <item.icon size={18} />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
