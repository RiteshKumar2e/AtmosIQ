"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { regionsApi } from "@/lib/api";
import type { Region } from "@/types";

/**
 * The monitoring region every dashboard page reads from.
 *
 * Each intelligence endpoint accepts a `region_code`; this context holds the
 * user's choice, persists it across visits, and exposes it so pages can put it
 * in both their query parameters and their query keys.
 */

const STORAGE_KEY = "atmosiq.region";

interface RegionContextValue {
  /** Active region code, e.g. "IN-DL". Empty string until regions load. */
  regionCode: string;
  region: Region | null;
  regions: Region[];
  loading: boolean;
  setRegionCode: (code: string) => void;
}

const RegionContext = createContext<RegionContextValue | null>(null);

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["regions"],
    queryFn: regionsApi.list,
    // Deployment regions change about as often as the deployment does.
    staleTime: 30 * 60_000,
    retry: false,
  });

  // Restore the stored choice, falling back to the backend's configured node.
  useEffect(() => {
    if (!data || selected) return;

    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      /* storage unavailable; fall through to the default */
    }

    const isKnown = stored && data.regions.some((r) => r.region_code === stored);
    setSelected(isKnown ? (stored as string) : data.default_region_code);
  }, [data, selected]);

  const setRegionCode = useCallback((code: string) => {
    setSelected(code);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* selection still applies for this session */
    }
  }, []);

  const value = useMemo<RegionContextValue>(() => {
    const regions = data?.regions ?? [];
    return {
      regionCode: selected,
      region: regions.find((r) => r.region_code === selected) ?? null,
      regions,
      loading: isLoading,
      setRegionCode,
    };
  }, [data, selected, isLoading, setRegionCode]);

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion(): RegionContextValue {
  const context = useContext(RegionContext);
  if (!context) {
    throw new Error("useRegion must be used inside <RegionProvider>");
  }
  return context;
}
