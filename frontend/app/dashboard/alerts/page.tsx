"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BellRing,
  CheckCircle2,
  Clock,
  Lightbulb,
  MapPin,
  UserCheck,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  DataBadge,
  PageHeader,
  ResponsibleAiNotice,
  StatCard,
} from "@/components/dashboard/shared";
import {
  Button,
  Card,
  CardBody,
  Dialog,
  DialogContent,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Select,
  Skeleton,
} from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useRegion } from "@/hooks/useRegion";
import { ApiError, alertsApi } from "@/lib/api";
import { canActOnAlerts } from "@/lib/auth";
import { RISK_LEVELS } from "@/lib/constants";
import { cn, formatNumber, riskColor, timeAgo, titleCase } from "@/lib/utils";
import type { Alert, AlertStatus } from "@/types";

const STATUS_OPTIONS = ["NEW", "ACKNOWLEDGED", "ASSIGNED", "RESOLVED", "DISMISSED"];

/**
 * Legal next states, mirroring `_TRANSITIONS` in `backend/app/api/alerts.py`.
 *
 * The lifecycle is enforced server-side and returns 409 for an illegal move —
 * notably NEW → RESOLVED, because an alert nobody acknowledged should not be
 * closed. Offering a button the API will reject is a broken affordance, so the
 * action row is derived from this map instead of being hardcoded.
 */
const ALERT_TRANSITIONS: Record<string, AlertStatus[]> = {
  NEW: ["ACKNOWLEDGED", "ASSIGNED", "DISMISSED"],
  ACKNOWLEDGED: ["ASSIGNED", "RESOLVED", "DISMISSED"],
  ASSIGNED: ["RESOLVED", "ACKNOWLEDGED", "DISMISSED"],
  RESOLVED: [],
  DISMISSED: ["NEW"],
};

const ACTION_LABELS: Record<string, string> = {
  ACKNOWLEDGED: "Acknowledge",
  ASSIGNED: "Assign",
  RESOLVED: "Resolve",
  DISMISSED: "Dismiss",
  NEW: "Reopen",
};

export default function AlertsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canAct = canActOnAlerts(user);

  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [assigning, setAssigning] = useState<Alert | null>(null);
  const [assignee, setAssignee] = useState("");

  const { regionCode } = useRegion();

  const alerts = useQuery({
    queryKey: ["alerts", severity, status, regionCode],
    queryFn: () =>
      alertsApi.list({
        severity: severity || undefined,
        status: status || undefined,
        limit: 100,
        region_code: regionCode,
      }),
    enabled: Boolean(regionCode),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: { status?: AlertStatus; assigned_to?: string | null };
    }) => alertsApi.update(id, payload),
    onSuccess: (updated) => {
      toast.success("Alert updated", `${updated.title} is now ${titleCase(updated.status)}.`);
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: (error) => {
      toast.error(
        "Could not update alert",
        error instanceof ApiError ? error.message : "Please try again.",
      );
    },
  });

  const rows = alerts.data ?? [];

  const summary = useMemo(() => {
    const open = rows.filter((row) => ["NEW", "ACKNOWLEDGED", "ASSIGNED"].includes(row.status));
    return {
      total: rows.length,
      critical: rows.filter((row) => row.severity === "CRITICAL").length,
      open: open.length,
      resolved: rows.filter((row) => row.status === "RESOLVED").length,
    };
  }, [rows]);

  const act = (alert: Alert, next: AlertStatus) =>
    update.mutate({ id: alert.id, payload: { status: next } });

  const confirmAssign = () => {
    if (!assigning || !assignee.trim()) return;
    update.mutate({
      id: assigning.id,
      payload: { status: "ASSIGNED", assigned_to: assignee.trim() },
    });
    setAssigning(null);
    setAssignee("");
  };

  return (
    <>
      <PageHeader
        title="Alerts"
        subtitle="Early warnings raised where converging evidence indicates an actionable pollution event."
        badges={
          <>
            <DataBadge mode="MODELLED" />
            {!canAct ? (
              <span className="badge badge-neutral">
                Read-only — alert actions require an analyst or authority role
              </span>
            ) : null}
          </>
        }
      />

      <div className="alert-summary-strip">
        <StatCard
          label="Total alerts"
          value={summary.total}
          icon={BellRing}
          hint="Matching current filters"
        />
        <StatCard
          label="Critical"
          value={summary.critical}
          icon={BellRing}
          accent="var(--danger)"
          accentSoft="var(--danger-soft)"
          hint="Highest severity band"
        />
        <StatCard
          label="Open"
          value={summary.open}
          icon={Clock}
          accent="var(--warning)"
          accentSoft="var(--warning-soft)"
          hint="Awaiting resolution"
        />
        <StatCard
          label="Resolved"
          value={summary.resolved}
          icon={CheckCircle2}
          accent="var(--success)"
          accentSoft="var(--success-soft)"
          hint="Closed out"
        />
      </div>

      <div className="filter-bar">
        <Select
          value={severity}
          onChange={(event) => setSeverity(event.target.value)}
          aria-label="Filter by severity"
        >
          <option value="">All severities</option>
          {RISK_LEVELS.map((level) => (
            <option key={level} value={level}>
              {titleCase(level)}
            </option>
          ))}
        </Select>

        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {titleCase(value)}
            </option>
          ))}
        </Select>

        <span className="filter-bar-spacer" />
        <span className="filter-count">{formatNumber(rows.length)} shown</span>
      </div>

      {alerts.isLoading ? (
        <div className="alert-list">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} style={{ height: 200, borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
      ) : alerts.isError ? (
        <Card>
          <ErrorState
            title="Could not load alerts"
            message={(alerts.error as Error)?.message}
            onRetry={() => alerts.refetch()}
          />
        </Card>
      ) : !rows.length ? (
        <Card>
          <EmptyState
            icon={<BellRing size={20} />}
            title="No alerts match these filters"
            message="Nothing in this region currently meets the alerting threshold."
          />
        </Card>
      ) : (
        <div className="alert-list">
          {rows.map((alert) => (
            <article
              key={alert.id}
              className={cn("alert-card", alert.status === "RESOLVED" && "is-resolved")}
              style={{ ["--severity-color" as string]: riskColor(alert.severity) }}
            >
              <div className="alert-card-head">
                <div>
                  <h2 className="alert-title">{alert.title}</h2>
                  <div className="alert-meta">
                    <span className="alert-meta-item">
                      <MapPin size={13} aria-hidden="true" />
                      {alert.location_label}
                    </span>
                    <span className="alert-meta-item">
                      <Clock size={13} aria-hidden="true" />
                      {timeAgo(alert.created_at)}
                    </span>
                    <span className={`alert-status is-${alert.status.toLowerCase()}`}>
                      {titleCase(alert.status)}
                    </span>
                    <DataBadge mode={alert.data_mode} />
                  </div>
                </div>

                <div className="alert-risk">
                  <p className="alert-risk-value">{Math.round(alert.risk_score)}</p>
                  <p className="alert-risk-label">{alert.severity}</p>
                </div>
              </div>

              {alert.description ? (
                <p className="alert-description">{alert.description}</p>
              ) : null}

              {alert.recommended_action ? (
                <div className="alert-recommendation">
                  <Lightbulb size={16} aria-hidden="true" />
                  <div>
                    <p className="alert-recommendation-label">Recommended action</p>
                    <p className="alert-recommendation-text">{alert.recommended_action}</p>
                  </div>
                </div>
              ) : null}

              <div className="alert-actions">
                {canAct ? (
                  (() => {
                    const allowed = ALERT_TRANSITIONS[alert.status] ?? [];
                    if (!allowed.length) {
                      return (
                        <span
                          className="text-muted"
                          style={{ fontSize: "var(--text-xs)" }}
                        >
                          This alert is resolved. No further action is available.
                        </span>
                      );
                    }

                    return allowed.map((next) => (
                      <Button
                        key={next}
                        // Resolve is the terminal, deliberate action.
                        variant={next === "RESOLVED" ? "primary" : "secondary"}
                        size="sm"
                        disabled={update.isPending}
                        onClick={() => {
                          if (next === "ASSIGNED") {
                            setAssigning(alert);
                            setAssignee(alert.assigned_to ?? "");
                          } else {
                            act(alert, next);
                          }
                        }}
                      >
                        {ACTION_LABELS[next] ?? titleCase(next)}
                      </Button>
                    ));
                  })()
                ) : (
                  <span className="text-muted" style={{ fontSize: "var(--text-xs)" }}>
                    Sign in as an analyst or authority to act on this alert.
                  </span>
                )}

                <span className="alert-actions-spacer" />

                {alert.assigned_to ? (
                  <span className="alert-assignee">
                    <UserCheck size={13} aria-hidden="true" />
                    Assigned to {alert.assigned_to}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <ResponsibleAiNotice />

      {/* Assign dialog ------------------------------------------------------ */}
      <Dialog open={Boolean(assigning)} onOpenChange={(open) => !open && setAssigning(null)}>
        {assigning ? (
          <DialogContent
            title="Assign alert"
            description={assigning.title}
            footer={
              <>
                <Button variant="secondary" onClick={() => setAssigning(null)}>
                  Cancel
                </Button>
                <Button onClick={confirmAssign} disabled={!assignee.trim()}>
                  Assign
                </Button>
              </>
            }
          >
            <Field
              label="Responding unit"
              htmlFor="assign-to"
              required
              hint="The team or officer taking ownership of this alert."
            >
              <Input
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
                placeholder="North Delhi Field Inspection Unit"
                autoFocus
              />
            </Field>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
