import { ArrowLeft, BrainCircuit, Gauge, ShieldCheck, Wind } from "lucide-react";
import Link from "next/link";

import { APP_NAME } from "@/lib/constants";

const POINTS = [
  {
    icon: BrainCircuit,
    title: "Multimodal AI analysis",
    text: "Citizen photographs classified by Google Gemini into event type, visible indicators and a likely source.",
  },
  {
    icon: Gauge,
    title: "Explainable risk scoring",
    text: "Every score decomposed into the weighted factors that produced it — never an unexplained number.",
  },
  {
    icon: ShieldCheck,
    title: "Provenance on every value",
    text: "LIVE, SIMULATED and MODELLED labels so synthetic data is never mistaken for a measurement.",
  },
];

/**
 * Layout for /login, /register and /forgot-password.
 *
 * Deliberately excludes the public marketing navbar — authentication is a
 * focused task, and the surrounding chrome would compete with it.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <Link href="/" className="auth-aside-brand">
          <span className="brand-mark" aria-hidden="true">
            <Wind size={18} />
          </span>
          {APP_NAME}
        </Link>

        <div className="auth-aside-body">
          <h2 className="auth-aside-title">
            Hyperlocal air pollution intelligence and climate early warning.
          </h2>
          <p className="auth-aside-text">
            Sign in to explore hotspot detection, six-hour risk forecasting and the authority
            alert queue.
          </p>

          <div className="auth-aside-points">
            {POINTS.map((point) => (
              <div className="auth-aside-point" key={point.title}>
                <span className="auth-aside-point-icon" aria-hidden="true">
                  <point.icon size={17} />
                </span>
                <div>
                  <strong>{point.title}</strong>
                  {point.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="auth-aside-footer">
          AI-generated environmental assessments are decision-support signals and should not
          replace certified air-quality measurements or official environmental monitoring.
        </p>
      </aside>

      <div className="auth-main">
        <div className="auth-topbar">
          <Link href="/" className="auth-mobile-brand">
            <span className="brand-mark" aria-hidden="true">
              <Wind size={16} />
            </span>
            {APP_NAME}
          </Link>

          <Link href="/" className="auth-back-link">
            <ArrowLeft size={15} aria-hidden="true" />
            Back to Home
          </Link>
        </div>

        <main id="main-content" className="auth-form-wrap">
          {children}
        </main>
      </div>
    </div>
  );
}
