import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BellRing,
  BrainCircuit,
  CloudFog,
  Database,
  EyeOff,
  Gauge,
  Globe2,
  Layers,
  MapPinned,
  Radio,
  Satellite,
  ShieldCheck,
  Siren,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";

import { DataBadge } from "@/components/dashboard/shared";
import { HeroVisual } from "@/components/landing/HeroVisual";
import { Button } from "@/components/ui";
import { APP_DESCRIPTION, BRICS_COUNTRIES } from "@/lib/constants";

/* ========================================================================== */
/* Hero                                                                       */
/* ========================================================================== */
export function Hero() {
  return (
    <section className="hero">
      <div className="container hero-inner">
        <div className="hero-copy">
          <p className="hero-eyebrow">
            <span className="hero-eyebrow-tag">BRICS</span>
            Clean Air &amp; Climate Resilience
          </p>

          <h1 className="hero-title">
            See Pollution Before It Becomes a <em>Crisis.</em>
          </h1>

          <p className="hero-subtitle">{APP_DESCRIPTION}</p>

          <div className="hero-actions">
            <Button asChild size="lg" variant="primary">
              <Link href="/dashboard/intelligence">
                Explore Intelligence
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/dashboard/reports">Report Pollution</Link>
            </Button>
          </div>

          <div className="hero-stats">
            <div>
              <p className="hero-stat-value">Hyperlocal</p>
              <p className="hero-stat-label">Detection between fixed stations</p>
            </div>
            <div>
              <p className="hero-stat-value">Multimodal</p>
              <p className="hero-stat-label">Gemini image &amp; text analysis</p>
            </div>
            <div>
              <p className="hero-stat-value">6-hour</p>
              <p className="hero-stat-label">Forward risk forecast</p>
            </div>
            <div>
              <p className="hero-stat-value">5 nations</p>
              <p className="hero-stat-label">Interoperable BRICS design</p>
            </div>
          </div>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}

/* ========================================================================== */
/* Problem                                                                    */
/* ========================================================================== */
const PROBLEM_NODES = [
  {
    icon: Satellite,
    title: "Fixed Monitoring Stations",
    text: "Reference-grade instruments, sparsely distributed across a metropolitan region.",
  },
  {
    icon: EyeOff,
    title: "Coverage Gaps",
    text: "Kilometres of populated ground sit between one station and the next.",
  },
  {
    icon: CloudFog,
    title: "Hidden Local Pollution",
    text: "A landfill fire or an uncontrolled stack never reaches the nearest sensor.",
  },
  {
    icon: Timer,
    title: "Delayed Detection",
    text: "The event surfaces only once it has spread far enough to move a city-wide average.",
  },
  {
    icon: AlertTriangle,
    title: "Delayed Response",
    text: "By the time an inspection is dispatched, exposure has already occurred.",
  },
];

export function ProblemSection() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-header centered">
          <p className="eyebrow">
            <AlertTriangle size={13} aria-hidden="true" />
            The Problem
          </p>
          <h2>Traditional monitoring misses what happens between the sensors.</h2>
          <p className="section-lead">
            Regulatory monitoring infrastructure is accurate, valuable and worth protecting.
            But fixed stations measure the air at their own location — and a pollution event
            two kilometres away may never register until it has already spread.
          </p>
        </div>

        <div className="problem-flow">
          {PROBLEM_NODES.map((node, index) => (
            <div key={node.title} style={{ display: "contents" }}>
              <article className="problem-node">
                <span className="problem-node-icon" aria-hidden="true">
                  <node.icon size={19} />
                </span>
                <h3 className="problem-node-title">{node.title}</h3>
                <p className="problem-node-text">{node.text}</p>
              </article>
              {index < PROBLEM_NODES.length - 1 ? (
                <div className="problem-flow-arrow" aria-hidden="true">
                  <ArrowRight size={18} />
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="problem-callout">
          <AlertTriangle size={20} aria-hidden="true" style={{ color: "var(--warning)", flexShrink: 0 }} />
          <div>
            <p className="problem-callout-title">The gap is where people live.</p>
            <p className="problem-callout-text">
              Industrial corridors, landfill perimeters, construction zones and congested
              junctions are precisely the places where exposure concentrates — and precisely
              the places least likely to sit next to a reference station.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ========================================================================== */
/* Solution                                                                   */
/* ========================================================================== */
const SOLUTION_STAGES = [
  {
    step: "01",
    icon: Users,
    title: "Citizen Signals",
    text: "People report what they can see and smell, with a photograph and a location.",
  },
  {
    step: "02",
    icon: BrainCircuit,
    title: "AI Analysis",
    text: "Gemini classifies the event type, visible indicators and a likely source.",
  },
  {
    step: "03",
    icon: Database,
    title: "Environmental Data",
    text: "Station readings, meteorology and historical patterns add measured context.",
  },
  {
    step: "04",
    icon: Gauge,
    title: "Risk Intelligence",
    text: "A weighted engine fuses every stream into an explainable risk score.",
  },
  {
    step: "05",
    icon: BellRing,
    title: "Early Warning",
    text: "Authorities receive a ranked alert with a concrete recommended action.",
  },
];

export function SolutionSection() {
  return (
    <section className="section section-alt">
      <div className="container">
        <div className="section-header centered">
          <p className="eyebrow">
            <Layers size={13} aria-hidden="true" />
            The Solution
          </p>
          <h2>From scattered signals to actionable intelligence.</h2>
          <p className="section-lead">
            AtmosIQ does not replace regulatory monitoring. It fills the space between
            stations with the one sensor network that already covers every street: the
            people who live there — then makes those observations rigorous enough to act on.
          </p>
        </div>

        <div className="solution-flow">
          {SOLUTION_STAGES.map((stage) => (
            <article className="solution-card" key={stage.step}>
              <span className="solution-card-step">{stage.step}</span>
              <span className="solution-card-icon" aria-hidden="true">
                <stage.icon size={20} />
              </span>
              <h3 className="solution-card-title">{stage.title}</h3>
              <p className="solution-card-text">{stage.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ========================================================================== */
/* Intelligence preview                                                       */
/* ========================================================================== */
const PREVIEW_HOTSPOTS = [
  { name: "Bawana Industrial Corridor", score: 89, level: "CRITICAL", source: "Industrial stack" },
  { name: "Anand Vihar Transport Hub", score: 84, level: "CRITICAL", source: "Traffic corridor" },
  { name: "Ghazipur Landfill Perimeter", score: 81, level: "CRITICAL", source: "Open waste burning" },
  { name: "Mundka Construction Zone", score: 71, level: "HIGH", source: "Construction dust" },
];

const PREVIEW_METRICS = [
  { label: "Current Air Risk", value: "72", suffix: " / 100", mode: "MODELLED", meta: "High risk band" },
  { label: "Active Hotspots", value: "12", suffix: "", mode: "MODELLED", meta: "Across 6 districts" },
  { label: "Citizen Signals", value: "438", suffix: "", mode: "SIMULATED", meta: "Last 30 days" },
  { label: "Critical Alerts", value: "4", suffix: "", mode: "MODELLED", meta: "Awaiting action" },
];

export function IntelligencePreview() {
  return (
    <section className="section intel-preview">
      <div className="container">
        <div className="section-header centered">
          <p className="eyebrow">
            <Activity size={13} aria-hidden="true" />
            Intelligence Preview
          </p>
          <h2>The operational picture, in one view.</h2>
          <p className="section-lead">
            Everything an air-quality officer needs to triage a morning: where risk is
            concentrated, which signals corroborate it, and what to do next.
          </p>
        </div>

        <div className="intel-preview-panel">
          <div className="intel-preview-bar">
            <span className="intel-preview-bar-title">
              <MapPinned size={16} aria-hidden="true" style={{ color: "var(--primary)" }} />
              Delhi NCR — Regional Intelligence
            </span>
            <DataBadge mode="SIMULATED" />
          </div>

          <div className="intel-preview-metrics">
            {PREVIEW_METRICS.map((metric) => (
              <div className="intel-metric" key={metric.label}>
                <p className="intel-metric-label">{metric.label}</p>
                <p className="intel-metric-value">
                  {metric.value}
                  {metric.suffix ? <small>{metric.suffix}</small> : null}
                </p>
                <p className="intel-metric-meta">
                  <DataBadge mode={metric.mode} />
                  {metric.meta}
                </p>
              </div>
            ))}
          </div>

          <div className="intel-preview-grid">
            <div className="intel-preview-map">
              <p className="intel-side-title">Risk distribution</p>
              <PreviewMap />
            </div>

            <div className="intel-preview-side">
              <p className="intel-side-title">Highest-risk hotspots</p>
              {PREVIEW_HOTSPOTS.map((hotspot, index) => (
                <div className="intel-hotspot-row" key={hotspot.name}>
                  <span className="intel-hotspot-rank">{index + 1}</span>
                  <div className="intel-hotspot-body">
                    <p className="intel-hotspot-name">{hotspot.name}</p>
                    <p className="intel-hotspot-meta">{hotspot.source}</p>
                  </div>
                  <span
                    className={`hotspot-score is-risk-${hotspot.level === "CRITICAL" ? "critical" : "high"}`}
                  >
                    {hotspot.score}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="intel-preview-footer">
            <span>
              Demonstration values. Not live regulatory measurements.
            </span>
            <Link href="/dashboard" className="auth-link">
              Open the full dashboard →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Compact choropleth-style preview of regional risk. */
function PreviewMap() {
  return (
    <div className="static-map" style={{ height: 300 }}>
      <svg viewBox="0 0 460 300" role="img" aria-label="Regional risk map with hotspots concentrated in the north-west industrial corridor">
        <rect width="460" height="300" fill="#eef3f2" />

        <g stroke="#d3dedc" strokeWidth="1.2">
          <path d="M14 24 L150 12 L182 96 L104 150 L22 124 Z" fill="#f6dcd6" />
          <path d="M150 12 L316 26 L332 112 L182 96 Z" fill="#fbe9e6" />
          <path d="M316 26 L448 20 L444 122 L332 112 Z" fill="#fdf2e0" />
          <path d="M22 124 L104 150 L120 278 L28 284 Z" fill="#fdf2e0" />
          <path d="M104 150 L182 96 L332 112 L316 240 L120 278 Z" fill="#f9e6e2" />
          <path d="M332 112 L444 122 L440 272 L316 240 Z" fill="#e9f3ec" />
        </g>

        <path
          d="M46 6 C 140 84, 176 130, 240 166 S 356 244, 396 296"
          stroke="#c5dbe4"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />

        {/* Hotspots, sized by risk */}
        <g stroke="#fff" strokeWidth="2.2">
          <circle cx="78" cy="70" r="13" fill="#b3372c" fillOpacity="0.9" />
          <circle cx="268" cy="66" r="12" fill="#b3372c" fillOpacity="0.9" />
          <circle cx="232" cy="196" r="11" fill="#b3372c" fillOpacity="0.85" />
          <circle cx="150" cy="210" r="9.5" fill="#c1611c" fillOpacity="0.9" />
          <circle cx="356" cy="80" r="8.5" fill="#a86a12" fillOpacity="0.9" />
          <circle cx="380" cy="196" r="7.5" fill="#2c7a56" fillOpacity="0.9" />
        </g>

        {/* Stations */}
        <g fill="#1c6394" stroke="#fff" strokeWidth="1.6">
          <rect x="118" y="112" width="12" height="12" rx="2.5" />
          <rect x="300" y="150" width="12" height="12" rx="2.5" />
          <rect x="196" y="252" width="12" height="12" rx="2.5" />
          <rect x="404" y="60" width="12" height="12" rx="2.5" />
        </g>
      </svg>

      <div className="map-legend" style={{ position: "absolute" }}>
        <p className="map-legend-title">Risk level</p>
        <div className="map-legend-items">
          <span className="map-legend-item">
            <span className="map-legend-swatch" style={{ background: "#b3372c" }} />
            Critical
          </span>
          <span className="map-legend-item">
            <span className="map-legend-swatch" style={{ background: "#c1611c" }} />
            High
          </span>
          <span className="map-legend-item">
            <span className="map-legend-swatch is-station" />
            Monitoring station
          </span>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Features preview                                                           */
/* ========================================================================== */
const FEATURE_PREVIEW = [
  {
    icon: MapPinned,
    title: "Hyperlocal Detection",
    text: "Detect localized pollution events beyond fixed monitoring stations.",
  },
  {
    icon: BrainCircuit,
    title: "AI Image Analysis",
    text: "Use Google Gemini multimodal analysis for citizen-submitted environmental images.",
  },
  {
    icon: TrendingUp,
    title: "Pollution Forecasting",
    text: "Predict near-term pollution risk across a six-hour operational horizon.",
  },
  {
    icon: Layers,
    title: "Risk Mapping",
    text: "Visualize environmental hotspots, coverage and citizen signals on one map.",
  },
  {
    icon: Siren,
    title: "Early Warning",
    text: "Notify relevant authorities with a ranked alert and a recommended action.",
  },
  {
    icon: Globe2,
    title: "BRICS Network",
    text: "Enable interoperable deployment across BRICS nations from one codebase.",
  },
];

export function FeaturesPreview() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-header centered">
          <p className="eyebrow">
            <Layers size={13} aria-hidden="true" />
            Capabilities
          </p>
          <h2>Built for the whole detection-to-action cycle.</h2>
        </div>

        <div className="features-preview-grid">
          {FEATURE_PREVIEW.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <span className="feature-card-icon" aria-hidden="true">
                <feature.icon size={21} />
              </span>
              <h3 className="feature-card-title">{feature.title}</h3>
              <p className="feature-card-text">{feature.text}</p>
            </article>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 36 }}>
          <Button asChild variant="secondary" size="lg">
            <Link href="/features">
              See all features
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ========================================================================== */
/* How It Works preview                                                       */
/* ========================================================================== */
const HIW_STEPS = [
  { icon: Users, label: "Report" },
  { icon: BrainCircuit, label: "Analyse" },
  { icon: MapPinned, label: "Detect" },
  { icon: TrendingUp, label: "Forecast" },
  { icon: BellRing, label: "Alert" },
  { icon: ShieldCheck, label: "Act" },
];

export function HowItWorksPreview() {
  return (
    <section className="section section-alt">
      <div className="container">
        <div className="section-header centered">
          <p className="eyebrow">
            <Radio size={13} aria-hidden="true" />
            How It Works
          </p>
          <h2>One pipeline, from observation to intervention.</h2>
        </div>

        <div className="hiw-preview-track">
          {HIW_STEPS.map((step, index) => (
            <div key={step.label} style={{ display: "contents" }}>
              <div className="hiw-preview-step">
                <span className="hiw-preview-icon" aria-hidden="true">
                  <step.icon size={21} />
                </span>
                <span className="hiw-preview-label">{step.label}</span>
              </div>
              {index < HIW_STEPS.length - 1 ? (
                <div className="hiw-preview-connector" aria-hidden="true">
                  <ArrowRight size={17} />
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          <Button asChild variant="primary" size="lg">
            <Link href="/how-it-works">
              Learn How It Works
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ========================================================================== */
/* BRICS vision                                                               */
/* ========================================================================== */
const BRICS_POINTS = [
  {
    icon: Database,
    title: "Interoperable data structures",
    text: "A shared observation and hotspot schema means a report from Delhi and one from São Paulo are the same object, versioned and exchangeable.",
  },
  {
    icon: BrainCircuit,
    title: "Locally deployable AI",
    text: "Each node runs its own analysis against its own data. No country is required to export raw citizen submissions to participate.",
  },
  {
    icon: Globe2,
    title: "Federated, not centralised",
    text: "Nodes share aggregate intelligence and model improvements, while data sovereignty stays with the deploying nation.",
  },
];

export function BricsVision() {
  return (
    <section className="section brics-vision">
      <div className="container">
        <div className="section-header centered">
          <p className="eyebrow">
            <Globe2 size={13} aria-hidden="true" />
            BRICS Vision
          </p>
          <h2>Built for one city. Designed for a network.</h2>
          <p className="section-lead">
            AtmosIQ contains no country-specific logic. A deployment is defined by
            configuration and region records, so any BRICS member state can run an
            independent node on the same codebase.
          </p>
        </div>

        <div className="brics-flag-row">
          {BRICS_COUNTRIES.map((country) => (
            <div className="brics-flag-card" key={country.code}>
              <span className="brics-flag-emoji" aria-hidden="true">
                {country.flag}
              </span>
              <span className="brics-flag-name">{country.name}</span>
            </div>
          ))}
        </div>

        <div className="brics-vision-points">
          {BRICS_POINTS.map((point) => (
            <article className="brics-vision-point" key={point.title}>
              <span className="brics-vision-point-icon" aria-hidden="true">
                <point.icon size={19} />
              </span>
              <h3>{point.title}</h3>
              <p>{point.text}</p>
            </article>
          ))}
        </div>

        <p
          style={{
            marginTop: 28,
            fontSize: "var(--text-sm)",
            color: "#7d918f",
            textAlign: "center",
          }}
        >
          This prototype demonstrates the interoperability contract with one active node and
          four configured partner nodes. It does not claim live cross-border data exchange.
        </p>
      </div>
    </section>
  );
}

/* ========================================================================== */
/* Impact                                                                     */
/* ========================================================================== */
const IMPACT_METRICS = [
  { value: "10+", label: "Monitoring Regions" },
  { value: "500+", label: "Citizen Signals" },
  { value: "40+", label: "Detected Hotspots" },
  { value: "15", label: "Active Alerts" },
];

export function ImpactSection() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-header centered">
          <p className="eyebrow">
            <Gauge size={13} aria-hidden="true" />
            Prototype Scale
          </p>
          <h2>What this prototype demonstrates today.</h2>
        </div>

        <div className="impact-grid">
          {IMPACT_METRICS.map((metric) => (
            <article className="impact-card" key={metric.label}>
              <p className="impact-value">{metric.value}</p>
              <p className="impact-label">{metric.label}</p>
            </article>
          ))}
        </div>

        <p className="impact-note">
          <DataBadge mode="SIMULATED" />
          <strong>Prototype Demonstration Data</strong> — deterministic and reproducible, not
          live regulatory measurements.
        </p>
      </div>
    </section>
  );
}

/* ========================================================================== */
/* Final CTA                                                                  */
/* ========================================================================== */
export function FinalCta() {
  return (
    <section className="final-cta">
      <div className="container">
        <h2>Turn environmental signals into early action.</h2>
        <p className="final-cta-text">
          Open the intelligence dashboard to explore live hotspot detection, forecasting and
          the alert queue — or submit an observation and watch the full pipeline run.
        </p>
        <div className="final-cta-actions">
          <Button asChild size="lg" variant="primary">
            <Link href="/dashboard">
              Open Intelligence Dashboard
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline-light">
            <Link href="/dashboard/reports">Report a Pollution Event</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
