"use client";

import { AlertTriangle, Home, RotateCcw, Wind } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui";
import { APP_NAME } from "@/lib/constants";

/**
 * Route-level error boundary.
 *
 * Replaces Next.js's unstyled default so a runtime failure still looks like
 * part of the product, and gives the user a way out rather than a dead end.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced in the browser console for support; a production deployment
    // would forward this to an error tracker instead.
    console.error("AtmosIQ route error:", error);
  }, [error]);

  return (
    <main id="main-content" className="status-page">
      <div className="status-page-inner">
        <Link href="/" className="brand status-page-brand">
          <span className="brand-mark" aria-hidden="true">
            <Wind size={18} />
          </span>
          {APP_NAME}
        </Link>

        <span className="status-icon is-error" aria-hidden="true">
          <AlertTriangle size={26} />
        </span>

        <h1 className="status-title">Something went wrong.</h1>
        <p className="status-message">
          This view failed to load. The rest of the platform is unaffected — you can retry,
          or head back and try a different page.
        </p>

        <div className="status-actions">
          <Button size="lg" onClick={reset}>
            <RotateCcw size={17} aria-hidden="true" />
            Try again
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/">
              <Home size={17} aria-hidden="true" />
              Back to Home
            </Link>
          </Button>
        </div>

        {error.digest ? (
          <p className="status-digest">
            Reference <code>{error.digest}</code>
          </p>
        ) : null}
      </div>
    </main>
  );
}
