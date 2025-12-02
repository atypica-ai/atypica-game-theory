"use client";

import { getSageByTokenAction } from "@/app/(sage)/(detail)/actions";
import { useSageContext } from "@/app/(sage)/(detail)/hooks/SageContext";
import { useEffect } from "react";
import useSWR from "swr";

export function SageStatusRefresher() {
  const { sage, status, updateSage } = useSageContext();

  // Only poll when sage is processing
  const shouldPoll = status === "processing";

  const { data } = useSWR(
    shouldPoll ? `sage-${sage.token}` : null,
    async () => {
      const result = await getSageByTokenAction(sage.token);
      if (!result.success) {
        throw new Error(result.message);
      }
      return result.data;
    },
    {
      refreshInterval: 5000, // Poll every 5 seconds
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 2000,
    },
  );

  // Update sage when data changes
  useEffect(() => {
    if (data) {
      updateSage(data);
    }
  }, [data, updateSage]);

  return null; // This component doesn't render anything
}
