"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  BellRing,
  BrainCircuit,
  CircleHelp,
  FileText,
  Globe2,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Settings,
  TrendingUp,
  Wind,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { useRegion } from "@/hooks/useRegion";
import { alertsApi } from "@/lib/api";
import { APP_NAME, DASHBOARD_NAV } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  BrainCircuit,
  MapPinned,
  FileText,
  TrendingUp,
  BellRing,
  BarChart3,
  Globe2,
  Settings,
};

export function DashboardSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { regionCode } = useRegion();

  /**
   * Alerts still awaiting a first response in the selected region.
   *
   * Scoped by region and keyed on it, so switching state updates the badge
   * instead of showing a network-wide total that never changes. Acting on an
   * alert invalidates the `["alerts"]` prefix, which refetches this too.
   */
  const { data: pendingAlerts } = useQuery({
    queryKey: ["alerts", "pending-count", regionCode],
    queryFn: () => alertsApi.list({ status: "NEW", limit: 200, region_code: regionCode }),
    enabled: Boolean(regionCode),
    retry: false,
    refetchInterval: 120_000,
  });

  const pendingCount = pendingAlerts?.length ?? 0;

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <>
      {open ? (
        <div className="sidebar-scrim" onClick={onClose} aria-hidden="true" />
      ) : null}

      <aside
        className={cn("dashboard-sidebar", open && "is-open")}
        aria-label="Dashboard navigation"
      >
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true">
            <Wind size={17} />
          </span>
          {APP_NAME}
          <button
            type="button"
            className="sidebar-close"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <p className="sidebar-section-label">Intelligence</p>
          {DASHBOARD_NAV.map((item) => {
            const Icon = ICONS[item.icon] ?? LayoutDashboard;
            const showBadge = item.href === "/dashboard/alerts" && pendingCount > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("sidebar-link", isActive(item.href) && "is-active")}
                aria-current={isActive(item.href) ? "page" : undefined}
                onClick={onClose}
              >
                <Icon size={17} aria-hidden="true" />
                {item.label}
                {showBadge ? (
                  <span
                    className="sidebar-badge"
                    aria-label={`${pendingCount} alerts awaiting response`}
                    title={`${pendingCount} alert${pendingCount === 1 ? "" : "s"} awaiting a first response in this region`}
                  >
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                ) : null}
              </Link>
            );
          })}

          <div className="sidebar-divider" />

          <Link
            href="/dashboard/settings"
            className={cn("sidebar-link", isActive("/dashboard/settings") && "is-active")}
            aria-current={isActive("/dashboard/settings") ? "page" : undefined}
            onClick={onClose}
          >
            <Settings size={17} aria-hidden="true" />
            Settings
          </Link>

          <Link href="/how-it-works" className="sidebar-link" onClick={onClose}>
            <CircleHelp size={17} aria-hidden="true" />
            Help
          </Link>

          <button type="button" className="sidebar-link" onClick={logout} style={{ width: "100%" }}>
            <LogOut size={17} aria-hidden="true" />
            Logout
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-avatar" aria-hidden="true">
              {initials(user?.name)}
            </span>
            <div className="sidebar-user-body">
              <p className="sidebar-user-name">{user?.name ?? "Signed in"}</p>
              <p className="sidebar-user-role">{user?.role ?? "citizen"}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
