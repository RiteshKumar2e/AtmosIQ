"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  ChevronDown,
  Flame,
  Globe2,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareWarning,
  Radar,
  Settings,
  TrendingUp,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AiProviderBadge } from "@/components/indicators";
import { Logo } from "@/components/layout/Logo";
import { Badge, Button } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/intelligence", label: "Pollution Intelligence", icon: Radar },
  { href: "/hotspots", label: "Live Hotspots", icon: Flame },
  { href: "/reports", label: "Citizen Reports", icon: MessageSquareWarning },
  { href: "/forecast", label: "Forecast", icon: TrendingUp },
  { href: "/alerts", label: "Alerts", icon: AlertTriangle },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/brics", label: "BRICS Network", icon: Globe2 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer on navigation so the new page is actually visible.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[var(--color-canvas)]">
      <Topbar onMenuToggle={() => setMobileOpen((open) => !open)} mobileOpen={mobileOpen} />

      <div className="mx-auto flex w-full max-w-[1600px]">
        {/* Desktop sidebar */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 border-r border-[var(--color-line)] bg-[var(--color-surface)] lg:block">
          <SidebarNav pathname={pathname} />
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 top-14 z-30 bg-black/25 lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <aside className="fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)] w-60 overflow-y-auto border-r border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-overlay)] lg:hidden">
              <SidebarNav pathname={pathname} />
            </aside>
          </>
        )}

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function SidebarNav({ pathname }: { pathname: string }) {
  const { data: alertSummary } = useQuery({
    queryKey: ["alert-summary"],
    queryFn: () => api.alertSummary(),
    refetchInterval: 60_000,
  });

  const openAlerts =
    alertSummary ? alertSummary.new + alertSummary.acknowledged + alertSummary.assigned : 0;

  return (
    <nav className="flex h-full flex-col overflow-y-auto p-3 scrollbar-thin" aria-label="Main">
      <ul className="space-y-0.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                    : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)]",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-[var(--color-brand-600)]" : "text-[var(--color-ink-subtle)]",
                  )}
                  aria-hidden
                />
                <span className="truncate">{item.label}</span>
                {item.href === "/alerts" && openAlerts > 0 && (
                  <span className="ml-auto rounded-full bg-[var(--color-risk-critical)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white tabular">
                    {openAlerts}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 border-t border-[var(--color-line)] pt-3">
        <Link href="/reports/new" className="block">
          <Button size="sm" className="w-full justify-start">
            <MessageSquareWarning className="h-3.5 w-3.5" aria-hidden />
            Report an event
          </Button>
        </Link>
      </div>

      <div className="mt-auto space-y-2 pt-4">
        <SystemStatus />
      </div>
    </nav>
  );
}

function SystemStatus() {
  const { data: health, isError } = useQuery({
    queryKey: ["health"],
    queryFn: () => api.health(),
    refetchInterval: 120_000,
    retry: 1,
  });

  const online = !!health && health.status === "ok" && !isError;

  return (
    <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface-sunken)] p-2.5">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            online
              ? "bg-[var(--color-risk-low)] animate-[var(--animate-pulse-soft)]"
              : "bg-[var(--color-risk-critical)]",
          )}
          aria-hidden
        />
        <span className="text-[11px] font-medium text-[var(--color-ink)]">
          {online ? "System operational" : "Backend unreachable"}
        </span>
      </div>
      {health && (
        <>
          <p className="mt-1 text-[10px] text-[var(--color-ink-subtle)]">
            API v{health.version} · {health.environment}
          </p>
          <div className="mt-1.5">
            <AiProviderBadge provider={health.ai_provider} />
          </div>
        </>
      )}
      {!online && (
        <p className="mt-1 text-[10px] leading-relaxed text-[var(--color-ink-muted)]">
          Start the API with <code className="font-mono">uvicorn app.main:app --reload</code>
        </p>
      )}
    </div>
  );
}

function Topbar({
  onMenuToggle,
  mobileOpen,
}: {
  onMenuToggle: () => void;
  mobileOpen: boolean;
}) {
  const { user, signOut } = useAuth();
  const [now, setNow] = useState<Date | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Rendered client-side only: a server-rendered clock would hydrate mismatched.
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const { data: overview } = useQuery({
    queryKey: ["overview"],
    queryFn: () => api.overview(),
    refetchInterval: 120_000,
  });

  const { data: alertSummary } = useQuery({
    queryKey: ["alert-summary"],
    queryFn: () => api.alertSummary(),
    refetchInterval: 60_000,
  });

  const openAlerts =
    alertSummary ? alertSummary.new + alertSummary.acknowledged + alertSummary.assigned : 0;

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-[var(--color-line)] bg-[var(--color-surface)]">
      <div className="mx-auto flex h-full w-full max-w-[1600px] items-center gap-3 px-3 sm:px-4">
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-sunken)] lg:hidden"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>

        <Link href="/dashboard" className="shrink-0">
          <Logo />
        </Link>

        {/* Region + conditions readout */}
        <div className="ml-2 hidden min-w-0 items-center gap-3 border-l border-[var(--color-line)] pl-3 md:flex">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Globe2 className="h-3 w-3 shrink-0 text-[var(--color-ink-subtle)]" aria-hidden />
              <span className="truncate text-xs font-medium text-[var(--color-ink)]">
                {overview ? overview.region_name : "Loading region…"}
              </span>
            </div>
            <p className="text-[10px] text-[var(--color-ink-subtle)]">
              {overview ? `${overview.country_code} · ${overview.region_code}` : "—"}
            </p>
          </div>

          {overview && (
            <div className="hidden lg:block">
              <Badge
                tone={
                  overview.current_risk_level === "CRITICAL"
                    ? "critical"
                    : overview.current_risk_level === "HIGH"
                      ? "high"
                      : overview.current_risk_level === "MODERATE"
                        ? "moderate"
                        : "low"
                }
                size="sm"
              >
                Air risk {Math.round(overview.current_risk)} · {overview.current_risk_level}
              </Badge>
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <time
            className="hidden text-[11px] tabular text-[var(--color-ink-muted)] sm:block"
            dateTime={now?.toISOString()}
            suppressHydrationWarning
          >
            {now
              ? now.toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })
              : "—"}
          </time>

          <Link
            href="/alerts"
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)]"
            aria-label={`Alerts${openAlerts > 0 ? `, ${openAlerts} open` : ""}`}
          >
            <Bell className="h-4 w-4" aria-hidden />
            {openAlerts > 0 && (
              <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--color-risk-critical)] px-1 text-[9px] font-semibold leading-none text-white tabular">
                {openAlerts > 99 ? "99+" : openAlerts}
              </span>
            )}
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-1.5 rounded-md py-1 pl-1 pr-1.5 hover:bg-[var(--color-surface-sunken)]"
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-[11px] font-semibold text-[var(--color-brand-700)]"
                aria-hidden
              >
                {user ? initials(user.name) : "?"}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-[11px] font-medium leading-tight text-[var(--color-ink)]">
                  {user ? user.name : "Guest"}
                </span>
                <span className="block text-[10px] capitalize leading-tight text-[var(--color-ink-subtle)]">
                  {user ? user.role : "Not signed in"}
                </span>
              </span>
              <ChevronDown className="h-3 w-3 text-[var(--color-ink-subtle)]" aria-hidden />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-1 w-56 animate-[var(--animate-fade-in)] rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-overlay)]"
              >
                {user ? (
                  <>
                    <div className="border-b border-[var(--color-line)] px-2.5 py-2">
                      <p className="truncate text-xs font-medium text-[var(--color-ink)]">
                        {user.name}
                      </p>
                      <p className="truncate text-[11px] text-[var(--color-ink-muted)]">
                        {user.email}
                      </p>
                      {user.organisation && (
                        <p className="mt-0.5 truncate text-[10px] text-[var(--color-ink-subtle)]">
                          {user.organisation}
                        </p>
                      )}
                      {user.is_demo && (
                        <Badge tone="neutral" size="sm" className="mt-1.5 border-dashed">
                          Demo account
                        </Badge>
                      )}
                    </div>
                    <Link
                      href="/settings"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 rounded px-2.5 py-1.5 text-xs text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)]"
                    >
                      <Settings className="h-3.5 w-3.5" aria-hidden />
                      Settings
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        void signOut();
                      }}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)]"
                    >
                      <LogOut className="h-3.5 w-3.5" aria-hidden />
                      Sign out
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded px-2.5 py-1.5 text-xs text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)]"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Standard page frame: title, description, actions, consistent padding. */
export function PageHeader({
  title,
  description,
  actions,
  badges,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badges?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">{title}</h1>
          {badges}
        </div>
        {description && (
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--color-ink-muted)]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-4 py-4 sm:px-6 sm:py-5", className)}>{children}</div>;
}
