"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  Database,
  Globe2,
  Layers,
  Lock,
  Server,
  Share2,
  ShieldCheck,
} from "lucide-react";

import {
  DataBadge,
  PageHeader,
  ResponsibleAiNotice,
  StatCard,
} from "@/components/dashboard/shared";
import {
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  Skeleton,
} from "@/components/ui";
import { bricsApi } from "@/lib/api";
import { cn, formatNumber, riskColor, riskLevelFromScore, timeAgo } from "@/lib/utils";

const FEDERATION_LAYERS = [
  {
    title: "Local Data",
    text: "Citizen reports, station readings and imagery are captured and stored inside the deploying nation's own infrastructure.",
    boundary: false,
  },
  {
    title: "Local Processing",
    text: "Validation, clustering and risk scoring run entirely on the local node. No raw submission leaves the country.",
    boundary: false,
  },
  {
    title: "Local AI",
    text: "Multimodal analysis is invoked by the node itself, against its own configuration and language settings.",
    boundary: false,
  },
  {
    title: "Interoperability Layer",
    text: "The boundary. Only aggregate, schema-versioned intelligence crosses it — never raw citizen data.",
    boundary: true,
  },
  {
    title: "Shared Intelligence",
    text: "Partner nodes exchange comparable hotspot statistics, source composition and model improvements.",
    boundary: false,
  },
];

const PRINCIPLES_FALLBACK = [
  {
    title: "Data sovereignty",
    detail:
      "Each nation retains full custody of the observations submitted within its borders.",
  },
  {
    title: "Schema versioning",
    detail:
      "A shared, versioned contract keeps records comparable as individual nodes evolve.",
  },
  {
    title: "Local autonomy",
    detail:
      "Nodes deploy, configure and operate independently, with no central controller.",
  },
  {
    title: "Aggregate exchange only",
    detail:
      "Cross-border traffic is limited to derived statistics, never personal or raw data.",
  },
];

export default function BricsNetworkPage() {
  const brics = useQuery({
    queryKey: ["brics", "overview"],
    queryFn: () => bricsApi.overview(),
  });

  const data = brics.data;
  const nodes = data?.nodes ?? [];
  const principles = data?.federation_principles?.length
    ? data.federation_principles
    : PRINCIPLES_FALLBACK;

  const totals = {
    regions: nodes.length,
    signals: nodes.reduce((sum, node) => sum + (node.citizen_signals ?? 0), 0),
    hotspots: nodes.reduce((sum, node) => sum + (node.active_hotspots ?? 0), 0),
    stations: nodes.reduce((sum, node) => sum + (node.monitoring_stations ?? 0), 0),
  };

  return (
    <>
      <PageHeader
        title="BRICS Network"
        subtitle="Federated deployment across BRICS member states, sharing intelligence without sharing raw citizen data."
        badges={
          <>
            <DataBadge mode={data?.data_mode ?? "SIMULATED"} />
            {data?.schema_version ? (
              <span className="badge badge-neutral">Schema {data.schema_version}</span>
            ) : null}
          </>
        }
      />

      <div className="disclaimer" style={{ marginBottom: 20 }}>
        <Globe2 size={16} aria-hidden="true" />
        <span>
          This prototype demonstrates the interoperability contract with one active node and
          configured partner nodes. It does <strong>not</strong> perform live cross-border
          data exchange — the architecture is designed to support it, and the figures shown
          for partner nodes are demonstration values.
        </span>
      </div>

      {brics.isError ? (
        <Card>
          <ErrorState
            title="Could not load the BRICS network"
            message={(brics.error as Error)?.message}
            onRetry={() => brics.refetch()}
          />
        </Card>
      ) : null}

      {/* Aggregate --------------------------------------------------------- */}
      <div className="kpi-grid">
        <StatCard
          label="Configured nodes"
          value={totals.regions}
          icon={Globe2}
          hint="BRICS member deployments"
          dataMode="SIMULATED"
        />
        <StatCard
          label="Monitoring stations"
          value={totals.stations}
          icon={Server}
          accent="var(--information)"
          accentSoft="var(--information-soft)"
          hint="Across the network"
          dataMode="SIMULATED"
        />
        <StatCard
          label="Citizen signals"
          value={totals.signals}
          icon={Share2}
          accent="var(--secondary)"
          accentSoft="var(--secondary-soft)"
          hint="Aggregate across nodes"
          dataMode="SIMULATED"
        />
        <StatCard
          label="Active hotspots"
          value={totals.hotspots}
          icon={Layers}
          accent="var(--warning)"
          accentSoft="var(--warning-soft)"
          hint="Currently detected"
          dataMode="MODELLED"
        />
      </div>

      {/* Nodes -------------------------------------------------------------- */}
      <Card className="dash-section-gap">
        <CardHeader
          title="Network nodes"
          subtitle="Each node runs the same codebase with its own region records and configuration."
          action={<DataBadge mode={data?.data_mode ?? "SIMULATED"} />}
        />
        <CardBody>
          {brics.isLoading ? (
            <div className="brics-country-grid">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <Skeleton key={index} style={{ height: 220, borderRadius: "var(--radius-lg)" }} />
              ))}
            </div>
          ) : (
            <div className="brics-country-grid">
              {nodes.map((node) => (
                <article className="brics-node-card" key={node.country_code}>
                  <div className="brics-node-head">
                    <span className="brics-node-flag" aria-hidden="true">
                      {node.flag}
                    </span>
                    <div>
                      <p className="brics-node-name">{node.country_name}</p>
                      <p className="brics-node-region">{node.region_code}</p>
                    </div>
                    <span
                      className={cn(
                        "badge brics-node-status",
                        node.node_status === "ACTIVE"
                          ? "badge-success"
                          : node.node_status === "PILOT"
                            ? "badge-warning"
                            : "badge-neutral",
                      )}
                    >
                      {node.node_status}
                    </span>
                  </div>

                  <div className="brics-node-metrics">
                    <div>
                      <p className="brics-node-metric-label">Avg risk</p>
                      <p
                        className="brics-node-metric-value"
                        style={{ color: riskColor(riskLevelFromScore(node.avg_risk)) }}
                      >
                        {Math.round(node.avg_risk)}
                      </p>
                    </div>
                    <div>
                      <p className="brics-node-metric-label">Hotspots</p>
                      <p className="brics-node-metric-value">{node.active_hotspots}</p>
                    </div>
                    <div>
                      <p className="brics-node-metric-label">Signals</p>
                      <p className="brics-node-metric-value">
                        {formatNumber(node.citizen_signals)}
                      </p>
                    </div>
                    <div>
                      <p className="brics-node-metric-label">Stations</p>
                      <p className="brics-node-metric-value">{node.monitoring_stations}</p>
                    </div>
                  </div>

                  <div className="brics-node-footer">
                    <span>{node.region_name}</span>
                    <span>Synced {timeAgo(node.last_sync)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Federated architecture --------------------------------------------- */}
      <Card className="dash-section-gap">
        <CardHeader
          title="Federated architecture"
          subtitle="Where data stops being local — and what crosses the boundary."
        />
        <CardBody>
          <div className="federation-stack">
            {FEDERATION_LAYERS.map((layer, index) => (
              <div key={layer.title}>
                <div
                  className={cn("federation-layer", layer.boundary && "is-boundary")}
                >
                  <span className="federation-layer-index" aria-hidden="true">
                    {layer.boundary ? <Lock size={16} /> : index + 1}
                  </span>
                  <div>
                    <p className="federation-layer-title">{layer.title}</p>
                    <p className="federation-layer-text">{layer.text}</p>
                  </div>
                </div>
                {index < FEDERATION_LAYERS.length - 1 ? (
                  <div className="federation-connector" aria-hidden="true">
                    <ArrowDown size={17} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Principles ---------------------------------------------------------- */}
      <Card className="dash-section-gap">
        <CardHeader
          title="Federation principles"
          subtitle="The commitments that make cross-border participation viable."
        />
        <CardBody>
          <div className="principle-grid">
            {principles.map((principle) => (
              <article className="principle-card" key={principle.title}>
                <span className="principle-icon" aria-hidden="true">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <h3>{principle.title}</h3>
                  <p>{principle.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Shared schema -------------------------------------------------------- */}
      {data?.shared_schema ? (
        <Card className="dash-section-gap">
          <CardHeader
            title="Shared data schema"
            subtitle="The versioned contract every node exchanges records against."
            action={
              <span className="badge badge-neutral">
                <Database size={12} aria-hidden="true" />
                {data.schema_version}
              </span>
            }
          />
          <CardBody>
            <div className="schema-block">
              <pre>{JSON.stringify(data.shared_schema, null, 2)}</pre>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {/* Interoperability layers ---------------------------------------------- */}
      {data?.interoperability_layers?.length ? (
        <Card className="dash-section-gap">
          <CardHeader
            title="Interoperability layers"
            subtitle="What each layer of the exchange contract is responsible for."
          />
          <CardBody>
            <div className="principle-grid">
              {data.interoperability_layers.map((layer) => (
                <article className="principle-card" key={layer.layer ?? layer.name}>
                  <span className="principle-icon" aria-hidden="true">
                    {/* The layers are an ordered stack, so show the position. */}
                    {layer.layer ? (
                      <span className="principle-index">{layer.layer}</span>
                    ) : (
                      <Layers size={18} />
                    )}
                  </span>
                  <div>
                    <h3>{layer.name}</h3>
                    <p>{layer.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}

      <ResponsibleAiNotice />
    </>
  );
}
