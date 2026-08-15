import {
  Activity,
  ArrowRight,
  BellRing,
  Building2,
  Camera,
  Globe2,
  Layers,
  LineChart,
  MapPin,
  Radio,
  ShieldCheck,
  Siren,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/layout/Logo";
import { Badge, Button, Card } from "@/components/ui/primitives";

export const metadata = {
  title: "See Pollution Before It Becomes a Crisis",
};

const PIPELINE = [
  { label: "Citizen Signals", icon: Users, detail: "Photographs, geolocation, local sensor readings" },
  { label: "AI Analysis", icon: Camera, detail: "Gemini classifies the event from the image" },
  { label: "Environmental Fusion", icon: Layers, detail: "Meteorology, satellite features, history" },
  { label: "Hotspot Detection", icon: MapPin, detail: "Weighted risk scoring and clustering" },
  { label: "Forecast", icon: TrendingUp, detail: "Six-hour risk trajectory with uncertainty" },
  { label: "Authority Action", icon: Siren, detail: "Prioritised alert with a concrete intervention" },
];

const CAPABILITIES = [
  {
    icon: MapPin,
    title: "Hyperlocal Detection",
    body: "Resolves pollution events at street level, in the gaps between fixed reference stations where most exposure actually happens.",
  },
  {
    icon: Camera,
    title: "AI Image Analysis",
    body: "Google Gemini classifies citizen photographs into event types with visible indicators — while stating plainly what an image cannot measure.",
  },
  {
    icon: LineChart,
    title: "Pollution Forecasting",
    body: "A transparent hybrid persistence-climatology model projects risk six hours ahead with uncertainty that widens honestly with the horizon.",
  },
  {
    icon: Activity,
    title: "Risk Mapping",
    body: "Every hotspot carries a risk score, a hotspot probability, a confidence value, and a per-factor breakdown of why it scored that way.",
  },
  {
    icon: BellRing,
    title: "Early Warning",
    body: "Alerts route to an operational queue with severity, forecast direction, and a specific recommended intervention — not just a number.",
  },
  {
    icon: Globe2,
    title: "Cross-Border Intelligence",
    body: "A shared schema and common risk bands make readings comparable between member states without centralising any citizen data.",
  },
];

const COUNTRIES = [
  { flag: "🇮🇳", name: "India", region: "Delhi NCR", status: "Reference node" },
  { flag: "🇧🇷", name: "Brazil", region: "São Paulo", status: "Pilot" },
  { flag: "🇷🇺", name: "Russia", region: "Moscow Oblast", status: "Planned" },
  { flag: "🇨🇳", name: "China", region: "Beijing", status: "Pilot" },
  { flag: "🇿🇦", name: "South Africa", region: "Gauteng", status: "Pilot" },
];

const METRICS = [
  { value: "5", label: "Monitoring regions", hint: "Across all BRICS member states" },
  { value: "39", label: "Citizen signals", hint: "Seeded demonstration reports" },
  { value: "21", label: "Detected hotspots", hint: "Registered by the risk engine" },
  { value: "10", label: "Active alerts", hint: "In the authority queue" },
  { value: "6 h", label: "Forecast horizon", hint: "With per-step uncertainty bounds" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      {/* ---------------------------------------------------------- header */}
      <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-surface)]/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Primary">
            <Link
              href="#how-it-works"
              className="hidden rounded px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] sm:block"
            >
              How it works
            </Link>
            <Link
              href="#brics"
              className="hidden rounded px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] sm:block"
            >
              BRICS network
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm">Open dashboard</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content">
        {/* ------------------------------------------------------- hero */}
        <section className="border-b border-[var(--color-line)] bg-gradient-to-b from-[var(--color-brand-50)] to-[var(--color-surface)]">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
            <div>
              <Badge tone="brand" size="md" className="mb-4">
                BRICS · Clean Air &amp; Climate Resilience
              </Badge>

              <h1 className="text-3xl font-semibold leading-[1.15] tracking-tight text-[var(--color-ink)] sm:text-4xl lg:text-[2.75rem]">
                See pollution before it becomes a crisis.
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--color-ink-muted)] sm:text-[15px]">
                AI-powered hyperlocal pollution intelligence combining citizen observations,
                environmental signals, and predictive analytics for climate-resilient cities.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/dashboard">
                  <Button size="lg">
                    Open intelligence dashboard
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Button>
                </Link>
                <Link href="/reports/new">
                  <Button size="lg" variant="secondary">Report a pollution event</Button>
                </Link>
              </div>

              <p className="mt-5 flex items-center gap-1.5 text-[11px] text-[var(--color-ink-subtle)]">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                Live meteorology and air quality from Open-Meteo. Demonstration data is labelled
                throughout.
              </p>
            </div>

            {/* Signal-flow illustration — the product's actual mechanism */}
            <div className="lg:pl-4">
              <Card className="overflow-hidden">
                <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-sunken)] px-4 py-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
                    Detection pipeline
                  </p>
                </div>
                <ol className="divide-y divide-[var(--color-line)]">
                  {PIPELINE.map((stage, index) => {
                    const Icon = stage.icon;
                    return (
                      <li key={stage.label} className="flex items-center gap-3 px-4 py-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-700)]">
                          <Icon className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[var(--color-ink)]">
                            {stage.label}
                          </p>
                          <p className="text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
                            {stage.detail}
                          </p>
                        </div>
                        <span className="text-[10px] tabular text-[var(--color-ink-subtle)]">
                          {index + 1}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </Card>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- problem */}
        <section className="border-b border-[var(--color-line)]">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
            <div className="max-w-3xl">
              <h2 className="text-xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-2xl">
                Conventional monitoring misses what happens between the stations
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                Reference-grade air quality stations are expensive, sparse, and fixed. A large
                metropolitan region may be covered by a few dozen of them, each representing
                conditions over several kilometres. But the pollution that harms people is often
                intensely local: a landfill fire, an uncontrolled stack, a demolition site without
                dust suppression, a congested junction at rush hour.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                Those events can raise concentrations several times above the regional background
                over a few hundred metres — and then disperse before anyone with an instrument
                arrives. The regional average records almost nothing. The people living beside it
                breathe all of it.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: Radio,
                  title: "Sparse by design",
                  body: "Reference stations cost tens of thousands of dollars each. Networks are sized for regulatory compliance reporting, not for hyperlocal exposure mapping.",
                },
                {
                  icon: Building2,
                  title: "Blind to short events",
                  body: "An open burn or an emission excursion can start and finish inside a single averaging window, leaving no trace in the official record.",
                },
                {
                  icon: Users,
                  title: "Residents already notice",
                  body: "People see the smoke, smell the burning, and lose visibility down their own street. That observation is real evidence — it has simply never been collected systematically.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.title} className="p-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-surface-sunken)] text-[var(--color-ink-muted)]">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <h3 className="mt-3 text-sm font-semibold text-[var(--color-ink)]">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                      {item.body}
                    </p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- how it works */}
        <section id="how-it-works" className="border-b border-[var(--color-line)] bg-[var(--color-canvas)]">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-2xl">
              How AeroShield works
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-muted)]">
              A citizen observation alone is an anecdote. Fused with measured air quality,
              meteorological dispersion conditions, satellite aerosol signals, and the location&apos;s
              own history, it becomes an actionable, explainable risk assessment.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PIPELINE.map((stage, index) => {
                const Icon = stage.icon;
                return (
                  <Card key={stage.label} className="p-4">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-brand-100)] text-[var(--color-brand-700)]">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
                          Stage {index + 1}
                        </p>
                        <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                          {stage.label}
                        </h3>
                      </div>
                    </div>
                    <p className="mt-2.5 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                      {stage.detail}
                    </p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- capabilities */}
        <section className="border-b border-[var(--color-line)]">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-2xl">
              Intelligence capabilities
            </h2>

            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CAPABILITIES.map((capability) => {
                const Icon = capability.icon;
                return (
                  <Card key={capability.title} className="p-5">
                    <Icon className="h-5 w-5 text-[var(--color-brand-600)]" aria-hidden />
                    <h3 className="mt-3 text-sm font-semibold text-[var(--color-ink)]">
                      {capability.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                      {capability.body}
                    </p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- BRICS */}
        <section id="brics" className="border-b border-[var(--color-line)] bg-[var(--color-canvas)]">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-2xl">
              Built for BRICS deployment
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--color-ink-muted)]">
              No country-specific logic exists anywhere in the codebase. A node is defined entirely
              by ISO 3166 identifiers and environment configuration, so any member state can deploy
              the same artefact against its own database, its own reference network, and its own
              thresholds — while remaining interoperable with the others.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {COUNTRIES.map((country) => (
                <Card key={country.name} className="p-4 text-center">
                  <span className="text-2xl" aria-hidden>{country.flag}</span>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                    {country.name}
                  </p>
                  <p className="text-[11px] text-[var(--color-ink-muted)]">{country.region}</p>
                  <Badge
                    tone={country.status === "Reference node" ? "brand" : "neutral"}
                    size="sm"
                    className="mt-2"
                  >
                    {country.status}
                  </Badge>
                </Card>
              ))}
            </div>

            <Card className="mt-6 p-5">
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                Federated, not centralised
              </h3>
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-[var(--color-ink-muted)]">
                Countries train and deploy local predictive models while sharing compatible model
                representations, schemas, and aggregated insights — without requiring centralised
                raw citizen data. Photographs, identities, and precise locations never cross a
                border; only non-personal aggregates and model weights do.
              </p>
              <div className="mt-4">
                <Link href="/brics">
                  <Button variant="secondary" size="sm">
                    See the interoperability architecture
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </section>

        {/* -------------------------------------------------------- impact */}
        <section className="border-b border-[var(--color-line)]">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-2xl">
                Prototype at a glance
              </h2>
              <Badge tone="neutral" size="md" className="border-dashed">
                Demonstration dataset
              </Badge>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-muted)]">
              These figures describe the seeded demonstration database that ships with the
              prototype, not a live deployment. No real-world accuracy or impact is claimed.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {METRICS.map((metric) => (
                <Card key={metric.label} className="p-4">
                  <p className="text-2xl font-semibold tabular text-[var(--color-brand-700)]">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-xs font-medium text-[var(--color-ink)]">{metric.label}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-ink-subtle)]">
                    {metric.hint}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- CTA */}
        <section className="bg-[var(--color-brand-700)]">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 text-center sm:px-6">
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Run the live detection scenario
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-brand-100)]">
              Watch a single citizen photograph travel through multimodal AI analysis, risk fusion,
              hotspot registration, and forecasting into an authority alert — in under a minute.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/dashboard">
                <Button size="lg" variant="secondary">
                  Open the dashboard
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-white hover:bg-[var(--color-brand-600)] hover:text-white"
                >
                  Use a demo account
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <Logo size={18} />
            <p className="mt-1.5 max-w-md text-[11px] leading-relaxed text-[var(--color-ink-subtle)]">
              Hackathon prototype for the BRICS Clean Air &amp; Climate Resilience track. AI
              assessments assist human authorities; they do not replace certified environmental
              measurement or make autonomous policy decisions.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px]" aria-label="Footer">
            <Link href="/dashboard" className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
              Dashboard
            </Link>
            <Link href="/brics" className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
              BRICS network
            </Link>
            <Link href="/settings" className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
              Responsible AI
            </Link>
            <Link href="/reports/new" className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
              Report an event
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
