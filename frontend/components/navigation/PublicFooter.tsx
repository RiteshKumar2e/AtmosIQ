import { Wind } from "lucide-react";
import Link from "next/link";

import { APP_NAME, PUBLIC_NAV, RESPONSIBLE_AI_NOTICE } from "@/lib/constants";

const PLATFORM_LINKS = [
  { label: "Overview", href: "/dashboard" },
  { label: "Intelligence", href: "/dashboard/intelligence" },
  { label: "Hotspots", href: "/dashboard/hotspots" },
  { label: "Forecast", href: "/dashboard/forecast" },
  { label: "BRICS Network", href: "/dashboard/brics-network" },
];

const ACCOUNT_LINKS = [
  { label: "Sign In", href: "/login" },
  { label: "Get Started", href: "/register" },
  { label: "Forgot Password", href: "/forgot-password" },
];

export function PublicFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link href="/" className="footer-brand">
              <span className="brand-mark" aria-hidden="true">
                <Wind size={18} />
              </span>
              {APP_NAME}
            </Link>
            <p className="footer-about">
              Hyperlocal air pollution intelligence and climate early warning, built for
              municipal authorities, analysts and the citizens who share the same air.
            </p>
          </div>

          <div>
            <h2 className="footer-heading">Platform</h2>
            <ul className="footer-links">
              {PUBLIC_NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="footer-heading">Intelligence</h2>
            <ul className="footer-links">
              {PLATFORM_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="footer-heading">Account</h2>
            <ul className="footer-links">
              {ACCOUNT_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-notice">{RESPONSIBLE_AI_NOTICE}</p>
          <p>
            {APP_NAME} — BRICS Clean Air &amp; Climate Resilience prototype.
          </p>
        </div>
      </div>
    </footer>
  );
}
