"use client";

import { useDocumentVisibility } from "@/hooks/use-document-visibility";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { getUserTokensBalanceAction } from "./actions";

/**
 * Hook to get user's token balance with automatic caching and refresh
 * Uses SWR to prevent redundant API calls across multiple components
 *
 * Refresh strategy:
 * - Only polls when document is visible (every 60s)
 * - Auto-refreshes when user switches back to the tab (revalidateOnFocus)
 * - Auto-refreshes when network reconnects (revalidateOnReconnect)
 * - No polling when document is not visible (saves resources)
 */
export function useTokensBalance() {
  const { status, data: session } = useSession();
  const { isDocumentVisible } = useDocumentVisibility();

  const isAuthenticated = status === "authenticated" && session?.user;

  const { data, error, isLoading, mutate } = useSWR(
    isAuthenticated ? "user-tokens-balance" : null,
    async () => {
      const result = await getUserTokensBalanceAction();
      if (!result.success) {
        throw new Error(result.message);
      }
      return result.data;
    },
    {
      refreshInterval: isDocumentVisible ? 60 * 1000 : 0, // 只在可见时轮询，不可见时停止
      revalidateOnFocus: true, // 切换回标签页时自动刷新
      revalidateOnReconnect: true, // 网络重连时自动刷新
      dedupingInterval: 30 * 1000, // 30秒去重
      shouldRetryOnError: false,
    },
  );

  return {
    balance: data ?? null,
    isLoading,
    error,
    refresh: mutate, // 手动刷新
  };
}
