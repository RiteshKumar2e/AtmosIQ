import {
  Building2,
  Globe2,
  HeartPulse,
  Layers,
  Radio,
  ScrollText,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import type { Metadata } from "next";

import { PublicShell } from "@/components/navigation/PublicShell";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why AtmosIQ exists, the monitoring gap it addresses, and how the platform turns citizen observations into decision-grade environmental intelligence.",
};

const WHY_POINTS = [
  {
    icon: Radio,
    title: "Coverage, not accuracy, is the bottleneck",
    text: "Reference stations are accurate where they stand. The problem is how much ground sits between them.",
  },
  {
    icon: Users,
    title: "People already notice pollution first",
    text: "Residents see the plume, smell the burning and lose visibility long before a city-wide average moves.",
  },
  {
    icon: Layers,
    title: "A single observation is not evidence",
    text: "One photograph proves little. Fused with sensors, meteorology and corroborating reports, it becomes a signal worth acting on.",
  },
  {
    icon: ShieldCheck,
    title: "Authorities need justification, not verdicts",
    text: "Every score AtmosIQ produces is decomposed into weighted contributing factors an officer can inspect and challenge.",
  },
];

const APPROACH = [
  {
    step: "01",
    title: "Collect what instruments miss",
    text: "Citizen submissions carry a photograph, a description, a location and optional handheld sensor values — the hyperlocal context no fixed station captures.",
  },
  {
    step: "02",
    title: "Interpret with multimodal AI",
    text: "Google Gemini classifies the event type and visible indicators, and is explicitly constrained never to infer an AQI value from an image.",
  },
  {
    step: "03",
    title: "Fuse against measured context",
    text: "The risk engine weighs the visual assessment against station readings, wind dispersion, humidity, time of day and corroborating reports nearby.",
  },
  {
    step: "04",
    title: "Escalate with a recommended action",
    text: "Where evidence converges, AtmosIQ raises a hotspot, forecasts its near-term direction and issues an alert with a concrete operational next step.",
  },
];

const RESILIENCE = [
  {
    icon: HeartPulse,
    title: "Public health",
    text: "Shorten the interval between an emission starting and residents being warned about it.",
  },
  {
    icon: Building2,
    title: "Institutional capacity",
    text: "Give under-resourced agencies a ranked queue instead of an undifferentiated complaint inbox.",
  },
  {
    icon: Globe2,
    title: "Climate cooperation",
    text: "Make air-quality intelligence comparable across borders through a shared, versioned data schema.",
  },
];

export default function AboutPage() {
  return (
    <PublicShell>
      <section className="page-hero">
        <div className="container page-hero-inner">
          <p className="eyebrow">
            <ScrollText size={13} aria-hidden="true" />
            About
          </p>
          <h1>Environmental intelligence for the air between the sensors.</h1>
          <p className="page-hero-lead">
            {APP_NAME} is a hyperlocal air pollution intelligence and climate early-warning
            platform built for the BRICS Clean Air &amp; Climate Resilience challenge. It
            exists to close the gap between where pollution happens and where it is measured.
          </p>
        </div>
      </section>

      {/* Why AtmosIQ ------------------------------------------------------- */}
      <section className="section">
        <div className="container">
          <div className="about-split">
            <div>
              <div className="section-header" style={{ marginBottom: 24 }}>
                <h2>Why AtmosIQ?</h2>
              </div>
              <div className="about-prose">
                <p>
                  Air quality management in large metropolitan regions rests on a network of
                  reference-grade monitoring stations. They are precise, calibrated and
                  legally defensible — and there are rarely more than a few dozen of them
                  across an area holding tens of millions of people.
                </p>
                <p>
                  That design is sound for tracking regional trends and regulatory compliance.
                  It is structurally unable to catch a landfill fire at its perimeter, an
                  uncontrolled stack in an industrial cluster, or a construction site working
                  without dust suppression. Those events are{" "}
                  <strong>hyperlocal, intermittent and consequential</strong>, and they are
                  exactly what a sparse fixed network averages away.
                </p>
                <p>
                  AtmosIQ treats that gap as an information problem rather than a hardware
                  problem. Instead of waiting for denser instrumentation, it makes the
                  observations people already make rigorous enough to act on.
                </p>
              </div>
            </div>

            <div className="about-panel">
              <h3 className="about-panel-title">The premise, in four parts</h3>
              <div className="about-list">
                {WHY_POINTS.map((point) => (
                  <div className="about-list-item" key={point.title}>
                    <span className="about-list-icon" aria-hidden="true">
                      <point.icon size={17} />
                    </span>
                    <div>
                      <p className="about-list-title">{point.title}</p>
                      <p className="about-list-text">{point.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Challenge ----------------------------------------------------- */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <h2>The Challenge</h2>
            <p className="section-lead">
              Three constraints shape air-quality response in fast-growing regions, and all
              three compound each other.
            </p>
          </div>

          <div className="about-prose" style={{ maxWidth: 820 }}>
            <p>
              <strong>Detection latency.</strong> A pollution event must grow large enough to
              influence a distant station before the monitoring system registers it at all. By
              then the population nearby has already been exposed for hours.
            </p>
            <p>
              <strong>Attribution difficulty.</strong> Even once elevated readings appear,
              identifying which specific activity caused them requires field investigation
              that agencies rarely have the capacity to run at scale.
            </p>
            <p>
              <strong>Prioritisation.</strong> Public complaint channels generate volume
              without ranking. Without a defensible way to order that queue, the loudest
              complaint gets attention rather than the most severe event.
            </p>
          </div>
        </div>
      </section>

      {/* Our Mission ------------------------------------------------------- */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <p className="eyebrow">
              <Target size={13} aria-hidden="true" />
              Our Mission
            </p>
            <h2>Our Mission</h2>
          </div>

          <div className="about-mission">
            <p className="about-mission-quote">
              &ldquo;To shorten the time between a pollution event starting and a responsible
              authority knowing about it — using the observations citizens already make,
              interpreted by AI, corroborated by measured environmental data, and delivered as
              a ranked, explainable early warning.&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* Our Approach ------------------------------------------------------ */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <h2>Our Approach</h2>
            <p className="section-lead">
              Four stages, each of which adds independent evidence rather than amplifying the
              previous one.
            </p>
          </div>

          <div className="approach-grid">
            {APPROACH.map((item) => (
              <article className="approach-card" key={item.step}>
                <span className="approach-card-step">{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Built for Climate Resilience -------------------------------------- */}
      <section className="section">
        <div className="container">
          <div className="section-header centered">
            <h2>Built for Climate Resilience</h2>
            <p className="section-lead">
              Air quality is the most immediate way most people experience climate and
              industrial pressure. Responding faster to it builds capacity that generalises.
            </p>
          </div>

          <div className="resilience-grid">
            {RESILIENCE.map((item) => (
              <article className="resilience-card" key={item.title}>
                <span className="resilience-icon" aria-hidden="true">
                  <item.icon size={21} />
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* BRICS Vision ------------------------------------------------------ */}
      <section className="section section-alt">
        <div className="container">
          <div className="about-split">
            <div>
              <div className="section-header" style={{ marginBottom: 24 }}>
                <p className="eyebrow">
                  <Globe2 size={13} aria-hidden="true" />
                  BRICS Vision
                </p>
                <h2>BRICS Vision</h2>
              </div>
              <div className="about-prose">
                <p>
                  Delhi, São Paulo, Moscow, Beijing and Johannesburg face structurally similar
                  air-quality problems: dense industrial corridors, heavy road transport,
                  seasonal burning and monitoring networks that cannot keep pace with urban
                  growth.
                </p>
                <p>
                  AtmosIQ contains no country-specific logic. Regions, coordinates, languages
                  and node identity are configuration, not code. A partner nation can deploy
                  the same codebase, keep its citizen data entirely within its own
                  infrastructure, and still exchange comparable hotspot and risk intelligence
                  through a shared, versioned schema.
                </p>
                <p>
                  This prototype demonstrates that contract with one active node and four
                  configured partner nodes. It does not claim live cross-border data exchange
                  — that is the deployment path the architecture is designed to support.
                </p>
              </div>
            </div>

            <div className="about-panel">
              <h3 className="about-panel-title">Design commitments</h3>
              <div className="about-list">
                <div className="about-list-item">
                  <span className="about-list-icon" aria-hidden="true">
                    <ShieldCheck size={17} />
                  </span>
                  <div>
                    <p className="about-list-title">Data sovereignty by default</p>
                    <p className="about-list-text">
                      Raw citizen submissions never leave the deploying node. Only aggregate
                      intelligence crosses a border.
                    </p>
                  </div>
                </div>
                <div className="about-list-item">
                  <span className="about-list-icon" aria-hidden="true">
                    <Layers size={17} />
                  </span>
                  <div>
                    <p className="about-list-title">One schema, many nodes</p>
                    <p className="about-list-text">
                      A versioned observation and hotspot contract keeps records comparable
                      across deployments.
                    </p>
                  </div>
                </div>
                <div className="about-list-item">
                  <span className="about-list-icon" aria-hidden="true">
                    <ScrollText size={17} />
                  </span>
                  <div>
                    <p className="about-list-title">Provenance on every value</p>
                    <p className="about-list-text">
                      Each figure is labelled LIVE, SIMULATED or MODELLED so no synthetic
                      number is ever mistaken for a measurement.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
