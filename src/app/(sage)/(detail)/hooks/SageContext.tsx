"use client";
import { getSageByTokenAction, fetchSageStatsAction } from "@/app/(sage)/(detail)/actions";
import type { SageProcessingStatus, SageStats } from "@/app/(sage)/(detail)/types";
import { getSageProcessingStatus } from "@/app/(sage)/(detail)/helpers";
import { ExtractServerActionData } from "@/lib/serverAction";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import useSWR from "swr";

// Re-export for convenience
export { getSageProcessingStatus };
export type { SageProcessingStatus, SageStats };

// Sage type with typed fields
export type SageWithTypedFields = ExtractServerActionData<typeof getSageByTokenAction>;

// Context type
interface SageContextValue {
  sage: SageWithTypedFields;
  processingStatus: SageProcessingStatus;
  stats: SageStats;
  isRefreshing: boolean;
}

// Create context
const SageContext = createContext<SageContextValue | null>(null);

// Provider component
export function SageStatusProvider({
  initialSage,
  initialStats,
  children,
}: {
  initialSage: SageWithTypedFields;
  initialStats: SageStats;
  children: ReactNode;
}) {
  const [sage, setSage] = useState<SageWithTypedFields>(initialSage);
  const [stats, setStats] = useState<SageStats>(initialStats);
  const processingStatus = getSageProcessingStatus(sage);

  // Auto-refresh sage data and stats when processing
  const shouldPoll = processingStatus === "processing";

  const { data: freshSage, isValidating: isSageRefreshing } = useSWR(
    shouldPoll ? `sage-${initialSage.token}` : null,
    async () => {
      const result = await getSageByTokenAction(initialSage.token);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    {
      refreshInterval: 5000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 2000,
    },
  );

  const { data: freshStats, isValidating: isStatsRefreshing } = useSWR(
    shouldPoll ? `sage-stats-${initialSage.token}` : null,
    async () => {
      const result = await fetchSageStatsAction(initialSage.token);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    {
      refreshInterval: 5000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 2000,
    },
  );

  // Update sage when fresh data arrives
  useEffect(() => {
    if (freshSage) {
      setSage(freshSage);
    }
  }, [freshSage]);

  // Update stats when fresh data arrives
  useEffect(() => {
    if (freshStats) {
      setStats(freshStats);
    }
  }, [freshStats]);

  // Sync with initial props
  useEffect(() => {
    setSage(initialSage);
  }, [initialSage]);

  useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);

  const isRefreshing = isSageRefreshing || isStatsRefreshing;

  return (
    <SageContext.Provider value={{ sage, processingStatus, stats, isRefreshing }}>
      {children}
    </SageContext.Provider>
  );
}

// Hook to use the context
export function useSageContext() {
  const context = useContext(SageContext);
  if (!context) {
    throw new Error("useSageContext must be used within SageStatusProvider");
  }
  return context;
}
