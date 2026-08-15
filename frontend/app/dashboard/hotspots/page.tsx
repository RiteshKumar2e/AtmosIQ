"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, MapPinned, Users } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import {
  DataBadge,
  DetailList,
  FactorList,
  PageHeader,
  ResponsibleAiNotice,
  RiskBadge,
} from "@/components/dashboard/shared";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Dialog,
  DialogContent,
  EmptyState,
  ErrorState,
  Select,
  Skeleton,
} from "@/components/ui";
import { useRegion } from "@/hooks/useRegion";
import { hotspotsApi } from "@/lib/api";
import { RISK_LEVELS } from "@/lib/constants";
import { formatNumber, riskColor, riskKey, timeAgo, titleCase } from "@/lib/utils";
import type { Hotspot } from "@/types";

const PollutionMap = dynamic(
  () => import("@/components/map/PollutionMap").then((mod) => mod.PollutionMap),
  {
    ssr: false,
    loading: () => <Skeleton style={{ height: 560, borderRadius: "var(--radius-lg)" }} />,
  },
);

export default function HotspotsPage() {
  const [riskLevel, setRiskLevel] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [selected, setSelected] = useState<Hotspot | null>(null);
  const { regionCode } = useRegion();

  const hotspots = useQuery({
    queryKey: ["hotspots", status, riskLevel, regionCode],
    queryFn: () =>
      hotspotsApi.list({
        status,
        risk_level: riskLevel || undefined,
        limit: 200,
        region_code: regionCode,
      }),
    enabled: Boolean(regionCode),
  });

  const layers = useQuery({
    queryKey: ["hotspots", "map", regionCode],
    queryFn: () => hotspotsApi.map(regionCode),
    enabled: Boolean(regionCode),
  });

  const rows = hotspots.data ?? [];

  const summary = useMemo(() => {
    if (!rows.length) {
      return { total: 0, critical: 0, avgRisk: 0, exposed: 0 };
    }
    return {
      total: rows.length,
      critical: rows.filter((row) => row.risk_level === "CRITICAL").length,
      avgRisk: rows.reduce((sum, row) => sum + row.risk_score, 0) / rows.length,
      exposed: rows.reduce((sum, row) => sum + (row.population_exposed ?? 0), 0),
    };
  }, [rows]);

  return (
    <>
      <PageHeader
        title="Live Hotspots"
        subtitle="Geographic clusters where converging evidence indicates an active pollution event."
        badges={
          <>
            <DataBadge mode="MODELLED" />
            <span className="text-muted" style={{ fontSize: "var(--text-xs)" }}>
              Hotspots are detected clusters, not certified measurements.
            </span>
          </>
        }
      />

      {/* Summary ----------------------------------------------------------- */}
      <div className="hotspot-summary-strip">
        <div className="hotspot-summary-item">
          <p className="hotspot-summary-label">Matching hotspots</p>
          <p className="hotspot-summary-value">{formatNumber(summary.total)}</p>
        </div>
        <div className="hotspot-summary-item">
          <p className="hotspot-summary-label">Critical</p>
          <p className="hotspot-summary-value" style={{ color: "var(--danger)" }}>
            {formatNumber(summary.critical)}
          </p>
        </div>
        <div className="hotspot-summary-item">
          <p className="hotspot-summary-label">Average risk</p>
          <p className="hotspot-summary-value">
            {summary.avgRisk ? Math.round(summary.avgRisk) : "—"}
          </p>
        </div>
        <div className="hotspot-summary-item">
          <p className="hotspot-summary-label">Population exposed</p>
          <p className="hotspot-summary-value">{formatNumber(summary.exposed)}</p>
        </div>
      </div>

      {/* Map --------------------------------------------------------------- */}
      <Card className="dash-section-gap">
        <CardHeader
          title="Hotspot map"
          subtitle="Select any hotspot to open its full assessment."
          action={<DataBadge mode="MODELLED" />}
        />
        <div style={{ padding: 16 }}>
          <PollutionMap
            hotspots={layers.data?.hotspots ?? rows}
            reports={layers.data?.reports ?? []}
            stations={layers.data?.stations ?? []}
            wind={layers.data?.wind}
            onSelectHotspot={setSelected}
          />
        </div>
      </Card>

      {/* Table ------------------------------------------------------------- */}
      <Card>
        <CardHeader
          title="Detected hotspots"
          subtitle="Ranked by fused risk score."
          action={
            <div className="filter-bar" style={{ margin: 0 }}>
              <Select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                aria-label="Filter by status"
              >
                <option value="ACTIVE">Active</option>
                <option value="MONITORING">Monitoring</option>
                <option value="RESOLVED">Resolved</option>
                <option value="ALL">All statuses</option>
              </Select>

              <Select
                value={riskLevel}
                onChange={(event) => setRiskLevel(event.target.value)}
                aria-label="Filter by severity"
              >
                <option value="">All severities</option>
                {RISK_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {titleCase(level)}
                  </option>
                ))}
              </Select>
            </div>
          }
        />

        {hotspots.isLoading ? (
          <CardBody>
            <Skeleton style={{ height: 240 }} />
          </CardBody>
        ) : hotspots.isError ? (
          <ErrorState
            title="Could not load hotspots"
            message={(hotspots.error as Error)?.message}
            onRetry={() => hotspots.refetch()}
          />
        ) : !rows.length ? (
          <EmptyState
            icon={<MapPinned size={20} />}
            title="No hotspots match these filters"
            message="Try widening the severity or status filter."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Location</th>
                  <th scope="col">Severity</th>
                  <th scope="col">Confidence</th>
                  <th scope="col">Likely source</th>
                  <th scope="col">Signals</th>
                  <th scope="col">Detected</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((hotspot) => (
                  <tr key={hotspot.id}>
                    <td>
                      <div className="hotspot-location">
                        <span className="hotspot-location-name">
                          {hotspot.location_label}
                        </span>
                        <span className="hotspot-coords">
                          {hotspot.latitude.toFixed(4)}, {hotspot.longitude.toFixed(4)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="hotspot-severity-cell">
                        <span className={`hotspot-score is-${riskKey(hotspot.risk_level)}`}>
                          {Math.round(hotspot.risk_score)}
                        </span>
                        <RiskBadge level={hotspot.risk_level} />
                      </div>
                    </td>
                    <td>
                      <div className="confidence-cell">
                        <span className="confidence-track">
                          <span
                            className="confidence-fill"
                            style={{ width: `${hotspot.confidence * 100}%` }}
                          />
                        </span>
                        <span className="confidence-value">
                          {Math.round(hotspot.confidence * 100)}%
                        </span>
                      </div>
                    </td>
                    <td>{titleCase(hotspot.likely_source)}</td>
                    <td className="tabular">{hotspot.signal_count}</td>
                    <td className="text-muted">{timeAgo(hotspot.detected_at)}</td>
                    <td>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelected(hotspot)}
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ResponsibleAiNotice />

      {/* Detail dialog ------------------------------------------------------ */}
      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        {selected ? (
          <DialogContent
            title={selected.location_label}
            description={`Detected ${timeAgo(selected.detected_at)} · ${selected.data_mode} assessment`}
            footer={
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Close
              </Button>
            }
          >
            <div className="hotspot-detail-head">
              <div>
                <RiskBadge level={selected.risk_level} />
                <p
                  className="text-muted"
                  style={{ fontSize: "var(--text-sm)", marginTop: 8 }}
                >
                  {titleCase(selected.pollution_type)} · {titleCase(selected.likely_source)}
                </p>
              </div>
              <div className="hotspot-detail-score">
                <p
                  className="hotspot-detail-score-value"
                  style={{ color: riskColor(selected.risk_level) }}
                >
                  {Math.round(selected.risk_score)}
                </p>
                <p className="text-muted" style={{ fontSize: "var(--text-xs)" }}>
                  risk / 100
                </p>
              </div>
            </div>

            <DetailList
              items={[
                {
                  label: "Hotspot probability",
                  value: `${Math.round(selected.hotspot_probability * 100)}%`,
                },
                { label: "Confidence", value: `${Math.round(selected.confidence * 100)}%` },
                { label: "Affected radius", value: `${selected.radius_km} km` },
                {
                  label: "Population exposed",
                  value: formatNumber(selected.population_exposed),
                },
                { label: "Corroborating signals", value: selected.signal_count },
                { label: "Status", value: titleCase(selected.status) },
                {
                  label: "Coordinates",
                  value: `${selected.latitude.toFixed(4)}, ${selected.longitude.toFixed(4)}`,
                },
              ]}
            />

            {selected.ai_summary ? (
              <div className="hotspot-detail-section">
                <p className="hotspot-detail-section-title">AI assessment</p>
                <p style={{ fontSize: "var(--text-sm)", lineHeight: 1.7 }}>
                  {selected.ai_summary}
                </p>
              </div>
            ) : null}

            {selected.contributions?.length ? (
              <div className="hotspot-detail-section">
                <p className="hotspot-detail-section-title">Why is this area at risk?</p>
                <FactorList factors={selected.contributions} />
              </div>
            ) : null}

            {selected.forecast_note ? (
              <div className="hotspot-detail-section">
                <p className="hotspot-detail-section-title">Forecast outlook</p>
                <p style={{ fontSize: "var(--text-sm)", lineHeight: 1.7 }}>
                  {selected.forecast_note}
                </p>
              </div>
            ) : null}

            {selected.recommended_action ? (
              <div className="hotspot-detail-section">
                <div className="hotspot-recommendation">
                  <p className="hotspot-recommendation-title">
                    <AlertTriangle size={15} aria-hidden="true" />
                    Recommended action
                  </p>
                  {selected.recommended_action}
                </div>
              </div>
            ) : null}

            <div className="hotspot-detail-section">
              <p className="text-muted" style={{ fontSize: "var(--text-xs)", lineHeight: 1.6 }}>
                <Users size={12} style={{ display: "inline", verticalAlign: "-2px" }} />{" "}
                This hotspot was derived from {selected.signal_count} signal
                {selected.signal_count === 1 ? "" : "s"} fused by the AtmosIQ risk engine. It
                is a decision-support assessment, not a certified air-quality measurement.
              </p>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
