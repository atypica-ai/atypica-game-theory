"use client";

import { ExtractServerActionData } from "@/lib/serverAction";
import useSWR, { mutate } from "swr";
import { getUserSwitchableIdentitiesAction, getUserTeamStatusAction } from "./actions";

/**
 * Manually refresh all team-related data
 * Call this after operations that change team status (create team, add/remove members, etc.)
 */
export function refreshTeamData() {
  mutate("user-team-status");
  mutate("user-team-switchable-identities");
}

/**
 * Hook to get user's team status with automatic caching and deduplication
 * Uses SWR to prevent redundant API calls across multiple components
 */
export function useTeamStatus() {
  const { data, error, isLoading, mutate } = useSWR(
    "user-team-status",
    async () => {
      const result = await getUserTeamStatusAction();
      if (!result.success) {
        throw new Error(result.message);
      }
      return result.data;
    },
    {
      revalidateOnFocus: false, // Don't revalidate on window focus
      revalidateOnReconnect: false, // Don't revalidate on reconnect
      dedupingInterval: 30 * 60 * 1000, // 30 minutes - team info rarely changes
      revalidateIfStale: false, // Don't auto-revalidate even if stale
      shouldRetryOnError: false, // Don't retry on error
      // Note: removed revalidateOnMount to allow initial fetch
    },
  );

  return {
    teamStatus: data as ExtractServerActionData<typeof getUserTeamStatusAction> | undefined,
    isLoading,
    error,
    refresh: mutate, // Manually refresh the data if needed
  };
}

/**
 * Hook to get user's switchable identities with automatic caching
 * Only fetches when enabled parameter is true
 */
export function useTeamSwitchableIdentities(enabled: boolean = true) {
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? "user-team-switchable-identities" : null,
    async () => {
      const result = await getUserSwitchableIdentitiesAction();
      if (!result.success) {
        throw new Error(result.message);
      }
      return result.data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30 * 60 * 1000, // 30 minutes
      revalidateIfStale: false,
      shouldRetryOnError: false,
      // Note: removed revalidateOnMount to allow initial fetch
    },
  );

  return {
    identities: data as
      | ExtractServerActionData<typeof getUserSwitchableIdentitiesAction>
      | undefined,
    isLoading,
    error,
    refresh: mutate,
  };
}
