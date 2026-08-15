"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/hooks/useAuth";

/**
 * Protects every /dashboard route.
 *
 * The session lives in localStorage, so the check must run on the client after
 * hydration. Unauthenticated visitors are sent to /login with a `redirect`
 * parameter so they land back where they were heading after signing in.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [loading, isAuthenticated, router, pathname]);

  if (loading || !isAuthenticated) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          minHeight: "100vh",
          color: "var(--muted)",
        }}
        role="status"
        aria-live="polite"
      >
        <Loader2 className="spinner" size={24} aria-hidden="true" />
        <p style={{ fontSize: "var(--text-sm)" }}>
          {loading ? "Checking your session…" : "Redirecting to sign in…"}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
