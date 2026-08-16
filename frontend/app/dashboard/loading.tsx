import { Skeleton } from "@/components/ui";

/**
 * Streamed while a dashboard route resolves.
 *
 * Mirrors the real page skeleton — header, KPI row, then a wide panel — so
 * navigation shows the shape of what is arriving instead of a blank column.
 */
export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <div className="page-header">
        <div style={{ flex: 1 }}>
          <Skeleton style={{ height: 30, width: 260, marginBottom: 10 }} />
          <Skeleton style={{ height: 14, width: "min(560px, 80%)" }} />
        </div>
        <Skeleton style={{ height: 38, width: 150, borderRadius: "var(--radius)" }} />
      </div>

      <div className="kpi-grid">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="skeleton-card" />
        ))}
      </div>

      <Skeleton
        style={{ height: 420, borderRadius: "var(--radius-lg)", marginBottom: 20 }}
      />

      <div className="analytics-grid-2">
        <Skeleton style={{ height: 260, borderRadius: "var(--radius-lg)" }} />
        <Skeleton style={{ height: 260, borderRadius: "var(--radius-lg)" }} />
      </div>
    </div>
  );
}
