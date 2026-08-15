"use client";

import { Check, ChevronDown, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useRegion } from "@/hooks/useRegion";
import { cn } from "@/lib/utils";

/**
 * City / state selector for the dashboard.
 *
 * Switching the region re-keys every dashboard query, so the whole platform —
 * map, hotspots, forecast, alerts, analytics — moves to the selected node.
 */
export function RegionSelector() {
  const { regionCode, region, regions, loading, setRegionCode } = useRegion();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (loading && !regions.length) {
    return <span className="skeleton region-trigger-skeleton" aria-hidden="true" />;
  }

  if (!regions.length) return null;

  return (
    <div className="region-selector" ref={rootRef}>
      <button
        type="button"
        className="region-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Monitoring region: ${region?.name ?? "select"}. Change region.`}
      >
        <MapPin size={14} aria-hidden="true" />
        <span className="region-trigger-label">
          {region ? (
            <>
              <span className="region-trigger-flag" aria-hidden="true">
                {region.flag}
              </span>
              {region.name}
            </>
          ) : (
            "Select region"
          )}
        </span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={cn("region-trigger-chevron", open && "is-open")}
        />
      </button>

      {open ? (
        <div className="region-menu" role="listbox" aria-label="Monitoring regions">
          <p className="region-menu-heading">Monitoring region</p>

          {regions.map((item) => {
            const active = item.region_code === regionCode;
            return (
              <button
                key={item.region_code}
                type="button"
                role="option"
                aria-selected={active}
                className={cn("region-option", active && "is-active")}
                onClick={() => {
                  setRegionCode(item.region_code);
                  setOpen(false);
                }}
              >
                <span className="region-option-flag" aria-hidden="true">
                  {item.flag}
                </span>

                <span className="region-option-body">
                  <span className="region-option-name">{item.name}</span>
                  <span className="region-option-meta">
                    {item.country_name} · {item.region_code}
                  </span>
                </span>

                <span
                  className={cn(
                    "region-option-status",
                    `is-${item.node_status.toLowerCase()}`,
                  )}
                >
                  {item.node_status}
                </span>

                {active ? (
                  <Check size={15} aria-hidden="true" className="region-option-check" />
                ) : null}
              </button>
            );
          })}

          <p className="region-menu-note">
            Switching region re-runs every query on this dashboard against the selected
            deployment node.
          </p>
        </div>
      ) : null}
    </div>
  );
}
