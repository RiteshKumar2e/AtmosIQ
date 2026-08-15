"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, ImageOff } from "lucide-react";
import { useState } from "react";

import {
  DataBadge,
  DetailList,
  PageHeader,
  ResponsibleAiNotice,
  RiskBadge,
} from "@/components/dashboard/shared";
import { ReportPollutionDialog } from "@/components/reports/ReportPollutionDialog";
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
import { reportsApi, resolveMediaUrl } from "@/lib/api";
import { REPORT_TYPES } from "@/lib/constants";
import { formatDateTime, riskColor, timeAgo, titleCase, truncate } from "@/lib/utils";
import type { Report } from "@/types";

const STATUSES = ["PENDING", "ANALYZED", "VERIFIED", "RESOLVED", "DISMISSED"];
const PAGE_SIZE = 12;

export default function ReportsPage() {
  const [page, setPage] = useState(1);
  const [reportType, setReportType] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<Report | null>(null);

  const { regionCode } = useRegion();

  const reports = useQuery({
    queryKey: ["reports", page, reportType, status, regionCode],
    queryFn: () =>
      reportsApi.list({
        page,
        page_size: PAGE_SIZE,
        report_type: reportType || undefined,
        status: status || undefined,
        region_code: regionCode,
      }),
    enabled: Boolean(regionCode),
  });

  const data = reports.data;
  const rows = data?.items ?? [];

  const resetFilter = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Citizen Reports"
        subtitle="Every observation submitted to AtmosIQ, with the AI assessment produced for it."
        badges={
          <>
            <DataBadge mode="SIMULATED" />
            <span className="text-muted" style={{ fontSize: "var(--text-xs)" }}>
              Seeded demonstration reports are labelled as such on each record.
            </span>
          </>
        }
        actions={<ReportPollutionDialog />}
      />

      <Card>
        <CardHeader
          title="Reports"
          subtitle={
            data ? `${data.total} report${data.total === 1 ? "" : "s"} recorded.` : undefined
          }
          action={
            <div className="filter-bar" style={{ margin: 0 }}>
              <Select
                value={reportType}
                onChange={(event) => resetFilter(setReportType)(event.target.value)}
                aria-label="Filter by pollution type"
              >
                <option value="">All types</option>
                {REPORT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>

              <Select
                value={status}
                onChange={(event) => resetFilter(setStatus)(event.target.value)}
                aria-label="Filter by status"
              >
                <option value="">All statuses</option>
                {STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {titleCase(value)}
                  </option>
                ))}
              </Select>
            </div>
          }
        />

        {reports.isLoading ? (
          <CardBody>
            <Skeleton style={{ height: 280 }} />
          </CardBody>
        ) : reports.isError ? (
          <ErrorState
            title="Could not load reports"
            message={(reports.error as Error)?.message}
            onRetry={() => reports.refetch()}
          />
        ) : !rows.length ? (
          <EmptyState
            icon={<FileText size={20} />}
            title="No reports match these filters"
            message="Adjust the filters, or submit the first observation for this area."
            action={
              <div style={{ marginTop: 12 }}>
                <ReportPollutionDialog />
              </div>
            }
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Location</th>
                    <th scope="col">Type</th>
                    <th scope="col">Description</th>
                    <th scope="col">Severity</th>
                    <th scope="col">Status</th>
                    <th scope="col">Date</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((report) => (
                    <tr key={report.id}>
                      <td>
                        <div className="hotspot-location">
                          <span className="hotspot-location-name">
                            {report.location_label || "Unnamed location"}
                          </span>
                          <span className="hotspot-coords">
                            {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="report-type-cell">
                          <span className="report-type-icon" aria-hidden="true">
                            <FileText size={13} />
                          </span>
                          {titleCase(report.report_type)}
                        </span>
                      </td>
                      <td className="report-description">
                        {truncate(report.description, 90)}
                      </td>
                      <td>
                        {report.assessment ? (
                          <RiskBadge level={report.assessment.risk_level} />
                        ) : (
                          <span className="text-muted">Not analysed</span>
                        )}
                      </td>
                      <td>
                        <span className={`report-status is-${report.status.toLowerCase()}`}>
                          {titleCase(report.status)}
                        </span>
                      </td>
                      <td className="text-muted">{timeAgo(report.created_at)}</td>
                      <td>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelected(report)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data && data.pages > 1 ? (
              <div className="pagination">
                <p className="pagination-info">
                  Page {data.page} of {data.pages} · {data.total} reports
                </p>
                <div className="pagination-controls">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= data.pages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </Card>

      <ResponsibleAiNotice />

      {/* Report detail ------------------------------------------------------ */}
      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        {selected ? (
          <DialogContent
            title={selected.location_label || "Citizen report"}
            description={`Submitted ${formatDateTime(selected.created_at)}${
              selected.reporter_name ? ` by ${selected.reporter_name}` : ""
            }`}
            footer={
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Close
              </Button>
            }
          >
            <div className="report-detail-grid">
              <div>
                {resolveMediaUrl(selected.image_url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="report-image"
                    src={resolveMediaUrl(selected.image_url) as string}
                    alt={`Photograph submitted with the report at ${selected.location_label}`}
                  />
                ) : (
                  <div className="report-image-placeholder">
                    <ImageOff size={22} aria-hidden="true" />
                    No image was attached to this report
                  </div>
                )}
              </div>

              <DetailList
                items={[
                  { label: "Pollution type", value: titleCase(selected.report_type) },
                  { label: "Status", value: titleCase(selected.status) },
                  {
                    label: "Coordinates",
                    value: `${selected.latitude.toFixed(4)}, ${selected.longitude.toFixed(4)}`,
                  },
                  { label: "PM2.5", value: selected.pm25 ? `${selected.pm25} µg/m³` : "—" },
                  { label: "PM10", value: selected.pm10 ? `${selected.pm10} µg/m³` : "—" },
                  {
                    label: "Temperature",
                    value: selected.temperature ? `${selected.temperature} °C` : "—",
                  },
                  {
                    label: "Humidity",
                    value: selected.humidity ? `${selected.humidity}%` : "—",
                  },
                  { label: "Provenance", value: <DataBadge mode={selected.data_mode} /> },
                ]}
              />
            </div>

            <div className="hotspot-detail-section">
              <p className="hotspot-detail-section-title">Citizen description</p>
              <p style={{ fontSize: "var(--text-sm)", lineHeight: 1.7 }}>
                {selected.description}
              </p>
            </div>

            {selected.assessment ? (
              <>
                <div className="hotspot-detail-section">
                  <p className="hotspot-detail-section-title">AI assessment</p>
                  <div className="assessment-block">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        marginBottom: 10,
                      }}
                    >
                      <span style={{ fontWeight: 650 }}>
                        {titleCase(selected.assessment.event_type)}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: riskColor(selected.assessment.risk_level),
                        }}
                      >
                        {Math.round(selected.assessment.risk_score)} / 100
                      </span>
                    </div>
                    <p className="assessment-summary">{selected.assessment.ai_summary}</p>
                  </div>
                </div>

                {selected.assessment.visible_indicators?.length ? (
                  <div className="hotspot-detail-section">
                    <p className="hotspot-detail-section-title">Visible indicators</p>
                    <div className="indicator-list">
                      {selected.assessment.visible_indicators.map((indicator) => (
                        <p className="indicator-item" key={indicator}>
                          <FileText size={13} aria-hidden="true" />
                          {indicator}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selected.assessment.recommended_action ? (
                  <div className="hotspot-detail-section">
                    <div className="hotspot-recommendation">
                      <p className="hotspot-recommendation-title">Recommended action</p>
                      {selected.assessment.recommended_action}
                    </div>
                  </div>
                ) : null}

                <div className="hotspot-detail-section">
                  <p className="text-muted" style={{ fontSize: "var(--text-xs)" }}>
                    Analysed by {selected.assessment.ai_provider} (
                    {selected.assessment.model_name}) in{" "}
                    {selected.assessment.analysis_ms} ms · confidence{" "}
                    {Math.round(selected.assessment.confidence * 100)}%
                  </p>
                </div>
              </>
            ) : (
              <div className="hotspot-detail-section">
                <EmptyState
                  title="Not yet analysed"
                  message="This report is queued and has not been through the AI pipeline."
                />
              </div>
            )}
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
