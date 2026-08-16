import { ArrowLeft, Compass, LayoutDashboard, Wind } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui";
import { APP_NAME, PUBLIC_NAV } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you are looking for does not exist on AtmosIQ.",
};

export default function NotFound() {
  return (
    <main id="main-content" className="status-page">
      <div className="status-page-inner">
        <Link href="/" className="brand status-page-brand">
          <span className="brand-mark" aria-hidden="true">
            <Wind size={18} />
          </span>
          {APP_NAME}
        </Link>

        <p className="status-code" aria-hidden="true">
          404
        </p>

        <h1 className="status-title">This page is off the map.</h1>
        <p className="status-message">
          The address you followed doesn&rsquo;t match any monitoring region, dashboard view
          or public page on AtmosIQ. It may have moved, or the link may be incomplete.
        </p>

        <div className="status-actions">
          <Button asChild size="lg">
            <Link href="/">
              <ArrowLeft size={17} aria-hidden="true" />
              Back to Home
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/dashboard">
              <LayoutDashboard size={17} aria-hidden="true" />
              Open Dashboard
            </Link>
          </Button>
        </div>

        <div className="status-links">
          <p className="status-links-label">
            <Compass size={13} aria-hidden="true" />
            Or jump to
          </p>
          <ul className="status-links-list">
            {PUBLIC_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
