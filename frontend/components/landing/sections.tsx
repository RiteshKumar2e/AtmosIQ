import {
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
