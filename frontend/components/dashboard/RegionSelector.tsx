"use client";

import { Check, ChevronDown, MapPin, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useRegion } from "@/hooks/useRegion";
import { cn } from "@/lib/utils";

/**
 * City / state selector for the dashboard.
 *
 * Switching the region re-keys every dashboard query, so the whole platform —
 * map, hotspots, forecast, alerts, analytics — moves to the selected state.
 *
 * The list is scoped by the API to this deployment's own country, so an Indian
 * node offers Indian states and nothing else.
 */
export function RegionSelector() {
  const { regionCode, region, regions, loading, setRegionCode } = useRegion();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

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

  // Focus search on open; clear the filter on close.
  useEffect(() => {
    if (open) {
      searchRef.current?.focus();
    } else {
      setSearch("");
    }
  }, [open]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return regions;
    return regions.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.region_code.toLowerCase().includes(term),
    );
  }, [regions, search]);

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
        <div className="region-menu">
          <div className="region-search">
            <Search size={14} aria-hidden="true" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search states and territories…"
              aria-label="Search regions"
            />
          </div>

          <div className="region-list" role="listbox" aria-label="Monitoring regions">
            {filtered.length ? (
              filtered.map((item) => {
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
                      <span className="region-option-meta">{item.region_code}</span>
                    </span>

                    {/* Only worth showing when a node is not yet live. */}
                    {item.node_status !== "ACTIVE" ? (
                      <span
                        className={cn(
                          "region-option-status",
                          `is-${item.node_status.toLowerCase()}`,
                        )}
                      >
                        {item.node_status}
                      </span>
                    ) : null}

                    {active ? (
                      <Check size={15} aria-hidden="true" className="region-option-check" />
                    ) : null}
                  </button>
                );
              })
            ) : (
              <p className="region-empty">No region matches “{search.trim()}”.</p>
            )}
          </div>

          <p className="region-menu-note">
            {regions.length} regions · switching re-runs every query on this dashboard.
          </p>
        </div>
      ) : null}
    </div>
  );
}
