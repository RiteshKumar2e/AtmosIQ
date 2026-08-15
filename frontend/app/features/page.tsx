import {
  BarChart3,
  BellRing,
  BrainCircuit,
  Check,
  Database,
  Gauge,
  Globe2,
  Layers,
  MapPinned,
  Minus,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Metadata } from "next";

import { PublicShell } from "@/components/navigation/PublicShell";

export const metadata: Metadata = {
  title: "Features",
  description:
    "The ten capabilities that take AtmosIQ from a citizen observation to an actionable early warning: AI analysis, hotspot detection, risk scoring, forecasting and BRICS interoperability.",
};

const FEATURES = [
  {
    icon: Users,
    title: "Citizen Intelligence",
    text: "Structured intake for citizen observations: a photograph, a description, a precise location, and optional handheld PM2.5, PM10, temperature and humidity readings. Every submission enters the same analysis pipeline regardless of who filed it.",
    usecase:
      "A resident photographs smoke rising from a landfill perimeter at 06:40. The report is geolocated, timestamped and queued for analysis before the nearest reference station registers any change.",
  },
  {
    icon: BrainCircuit,
    title: "AI Image Analysis",
    text: "Google Gemini performs multimodal classification of the submitted photograph, returning an event type, visible indicators, a visual severity band and a candidate source — under a hard constraint that an image can never establish an AQI or concentration value.",
    usecase:
      "Gemini identifies a dense dark plume discharging from an elevated stack, flags it as an industrial emission at 0.86 confidence, and explicitly notes that severity here is visual, not instrument-measured.",
  },
  {
    icon: MapPinned,
    title: "Pollution Hotspot Detection",
    text: "Corroborating signals in the same area are clustered into a hotspot with a centroid, an affected radius, a probability and a signal count — so a single unverified report is never treated as a confirmed event.",
    usecase:
      "Four reports within 900 metres over two hours are consolidated into one hotspot at 0.91 probability, rather than four separate items competing for an inspector's attention.",
  },
  {
    icon: Database,
    title: "Environmental Data Fusion",
    text: "Visual assessment is combined with reference station readings, live meteorology, and historical patterns for the same location, so the score reflects measured conditions and not only what a camera captured.",
    usecase:
      "A moderate-looking haze photograph is escalated after the engine factors in near-calm wind, 84% humidity and a station reporting PM2.5 well above the WHO guideline.",
  },
  {
    icon: Gauge,
    title: "Risk Scoring",
    text: "A transparent weighted engine produces a 0-100 risk score, a risk band, a hotspot probability and a calibrated confidence value — decomposed into the individual factors that drove it.",
    usecase:
      "An officer opens a score of 87 and sees exactly which contribution came from the sensor reading, which from the AI assessment and which from stagnant dispersion conditions.",
  },
  {
    icon: TrendingUp,
    title: "Forecasting",
    text: "A six-hour risk projection built from a persistence baseline, the diurnal boundary-layer cycle and wind dispersion, published with an explicit confidence band that widens with lead time.",
    usecase:
      "An afternoon score of 68 is projected to peak at 84 by 21:00 as the evening inversion sets in, giving the response team a window to act before the peak rather than after it.",
  },
  {
    icon: BellRing,
    title: "Early Warning",
    text: "Where evidence converges, an alert is raised with a severity band, the affected location, the driving risk score and a concrete recommended action, then tracked through acknowledge, assign and resolve.",
    usecase:
      "A critical alert recommends dispatching an inspection team within two hours and issuing a public advisory for sensitive groups, and records who acknowledged it and when.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    text: "Trend analysis across pollution levels, source composition, hotspot frequency, citizen participation and monitoring coverage — the evidence base for policy rather than for a single incident.",
    usecase:
      "A quarterly review shows open waste burning accounts for a third of detected hotspots in one district, directing enforcement resources by source type rather than by complaint volume.",
  },
  {
    icon: Globe2,
    title: "BRICS Intelligence",
    text: "A federated node model with a shared, versioned data schema. Each deployment processes and stores its own data locally, and exchanges only aggregate intelligence across borders.",
    usecase:
      "A partner nation deploys the same codebase with its own region records and language, keeps all citizen submissions in-country, and still contributes comparable hotspot statistics.",
  },
  {
    icon: ShieldCheck,
    title: "Responsible AI",
    text: "Every value carries a provenance label — LIVE, SIMULATED, MODELLED or AI ASSESSMENT. Model outputs are framed as decision support, numeric AQI claims are stripped from AI text, and the platform degrades to a documented demo analyser rather than failing when the AI provider is unavailable.",
    usecase:
      "A judge or auditor can trace any number on screen to its origin and confirm that no synthetic figure is presented as a certified measurement.",
  },
];

const COMPARISON = [
  { capability: "Regulatory-grade concentration measurement", fixed: true, atmosiq: false },
  { capability: "Coverage between monitoring stations", fixed: false, atmosiq: true },
  { capability: "Source attribution for a specific event", fixed: false, atmosiq: true },
  { capability: "Detection within minutes of an event starting", fixed: false, atmosiq: true },
  { capability: "Legally defensible compliance evidence", fixed: true, atmosiq: false },
  { capability: "Ranked, actionable response queue", fixed: false, atmosiq: true },
];

export default function FeaturesPage() {
  return (
    <PublicShell>
      <section className="page-hero">
        <div className="container page-hero-inner">
          <p className="eyebrow">
            <Layers size={13} aria-hidden="true" />
            Features
          </p>
          <h1>Ten capabilities, one continuous pipeline.</h1>
          <p className="page-hero-lead">
            Each capability below adds independent evidence or independent value to the stage
            before it. Together they take an observation from a phone camera to a ranked
            early warning on an authority&rsquo;s desk.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="feature-grid">
            {FEATURES.map((feature, index) => (
              <article className="feature-detail-card" key={feature.title}>
                <div className="feature-detail-head">
                  <span className="feature-detail-icon" aria-hidden="true">
                    <feature.icon size={22} />
                  </span>
                  <div>
                    <p className="feature-detail-index">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h2 className="feature-detail-title">{feature.title}</h2>
                  </div>
                </div>

                <p className="feature-detail-text">{feature.text}</p>

                <div className="feature-usecase">
                  <p className="feature-usecase-label">Real-world use case</p>
                  <p className="feature-usecase-text">{feature.usecase}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison -------------------------------------------------------- */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <h2>Complementary, not competing.</h2>
            <p className="section-lead">
              AtmosIQ is not a replacement for regulatory monitoring and does not claim to be.
              The two systems answer different questions.
            </p>
          </div>

          <div className="capability-table-wrap">
            <div className="table-wrap">
              <table className="capability-table">
                <thead>
                  <tr>
                    <th scope="col">Capability</th>
                    <th scope="col">Fixed monitoring network</th>
                    <th scope="col">AtmosIQ</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row) => (
                    <tr key={row.capability}>
                      <td>{row.capability}</td>
                      <td>
                        {row.fixed ? (
                          <span className="capability-yes">
                            <Check size={15} aria-hidden="true" />
                            Yes
                          </span>
                        ) : (
                          <span className="capability-no">
                            <Minus size={15} aria-hidden="true" />
                            Limited
                          </span>
                        )}
                      </td>
                      <td>
                        {row.atmosiq ? (
                          <span className="capability-yes">
                            <Check size={15} aria-hidden="true" />
                            Yes
                          </span>
                        ) : (
                          <span className="capability-no">
                            <Minus size={15} aria-hidden="true" />
                            Not claimed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
