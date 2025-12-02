"use client";
import { getSageByTokenAction, fetchSageStatsAction } from "@/app/(sage)/(detail)/actions";
import type { SageProcessingStatus, SageStats } from "@/app/(sage)/(detail)/types";
import { getSageProcessingStatus } from "@/app/(sage)/(detail)/helpers";
import { ExtractServerActionData } from "@/lib/serverAction";
import { createContext, ReactNode, useContext, useEffect } from "react";
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
  // Get initial processing status to determine polling behavior
  const initialProcessingStatus = getSageProcessingStatus(initialSage);
  const shouldPoll = initialProcessingStatus === "processing";

  // Use SWR to manage sage data with automatic refresh when processing
  const {
    data: freshSage,
    isValidating: isSageRefreshing,
    mutate: mutateSage,
  } = useSWR(
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

  // Use SWR to manage stats data with automatic refresh when processing
  const {
    data: freshStats,
    isValidating: isStatsRefreshing,
    mutate: mutateStats,
  } = useSWR(
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

  // Use fresh data from SWR when available, otherwise use initial props
  const sage = freshSage ?? initialSage;
  const stats = freshStats ?? initialStats;

  // Update SWR cache when props change (from router.refresh)
  useEffect(() => {
    mutateSage(initialSage, false);
  }, [initialSage, mutateSage]);

  useEffect(() => {
    mutateStats(initialStats, false);
  }, [initialStats, mutateStats]);

  const processingStatus = getSageProcessingStatus(sage);

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
