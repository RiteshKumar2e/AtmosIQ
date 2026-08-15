"use client";

import { useQuery } from "@tanstack/react-query";
import { Menu, Sparkles, Wifi, WifiOff } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { RegionSelector } from "@/components/dashboard/RegionSelector";
import { DashboardSidebar } from "@/components/navigation/DashboardSidebar";
import { RegionProvider } from "@/hooks/useRegion";
import { alertsApi, systemApi } from "@/lib/api";
import { DASHBOARD_NAV } from "@/lib/constants";

const TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/settings": "Settings",
};

for (const item of DASHBOARD_NAV) {
  TITLES[item.href] = item.label;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Health drives the connection chip; a failure here must not break the page.
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: systemApi.health,
    retry: false,
    refetchInterval: 60_000,
  });

  const { data: alerts } = useQuery({
    queryKey: ["alerts", "critical-count"],
    queryFn: () => alertsApi.list({ severity: "CRITICAL", status: "NEW", limit: 50 }),
    retry: false,
  });

  const title = TITLES[pathname] ?? "Intelligence";
  const aiProvider = health?.ai_provider ?? "—";
  const isDemoAi = aiProvider.toUpperCase().includes("DEMO");

  return (
    <AuthGuard>
      <RegionProvider>
      <div className="dashboard-shell">
        <DashboardSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          criticalAlerts={alerts?.length}
        />

        <div className="dashboard-main">
          <header className="dashboard-topbar">
            <button
              type="button"
              className="dashboard-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={19} />
            </button>

            <p className="topbar-title">{title}</p>

            <div className="topbar-meta">
              <RegionSelector />

              <span
                className="topbar-chip is-optional"
                title={`AI provider: ${aiProvider}`}
              >
                <Sparkles size={13} aria-hidden="true" />
                {isDemoAi ? "DEMO AI MODE" : "Gemini"}
              </span>

              <span
                className="topbar-chip"
                title={
                  health
                    ? `API ${health.status} · database ${health.database}`
                    : "Backend unreachable"
                }
              >
                {health ? (
                  <Wifi size={13} aria-hidden="true" style={{ color: "var(--success)" }} />
                ) : (
                  <WifiOff size={13} aria-hidden="true" style={{ color: "var(--danger)" }} />
                )}
                {health ? "Connected" : "Offline"}
              </span>
            </div>
          </header>

          <main id="main-content" className="dashboard-page">
            {children}
          </main>
        </div>
      </div>
      </RegionProvider>
    </AuthGuard>
  );
}
