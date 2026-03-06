"use client";

import { useDocumentVisibility } from "@/hooks/use-document-visibility";
import { useEffect, useRef } from "react";

export interface UseTaskDetailPollingOptions<TData> {
  enabled: boolean;
  fetcher: () => Promise<TData | null>;
  onData: (data: TData) => void;
  shouldContinue?: (data: TData) => boolean;
  onError?: (error: unknown) => void;
  intervalMs?: number;
  hiddenIntervalMs?: number;
  maxConsecutiveErrors?: number;
}

export function useTaskDetailPolling<TData>({
  enabled,
  fetcher,
  onData,
  shouldContinue,
  onError,
  intervalMs = 5000,
  hiddenIntervalMs = 30000,
  maxConsecutiveErrors = 3,
}: UseTaskDetailPollingOptions<TData>) {
  const { isDocumentVisible } = useDocumentVisibility();

  const fetcherRef = useRef(fetcher);
  const onDataRef = useRef(onData);
  const shouldContinueRef = useRef(shouldContinue);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    fetcherRef.current = fetcher;
    onDataRef.current = onData;
    shouldContinueRef.current = shouldContinue;
    onErrorRef.current = onError;
  }, [fetcher, onData, shouldContinue, onError]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let inFlight = false;
    let timer: NodeJS.Timeout | null = null;
    let consecutiveErrors = 0;

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const schedule = () => {
      if (cancelled) return;
      const delay = isDocumentVisible ? intervalMs : hiddenIntervalMs;
      timer = setTimeout(run, delay);
    };

    const run = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;

      try {
        const data = await fetcherRef.current();
        if (cancelled || data === null) return;

        consecutiveErrors = 0;
        onDataRef.current(data);

        if (shouldContinueRef.current?.(data)) {
          schedule();
        }
      } catch (error) {
        consecutiveErrors += 1;
        onErrorRef.current?.(error);

        if (consecutiveErrors < maxConsecutiveErrors) {
          schedule();
        }
      } finally {
        inFlight = false;
      }
    };

    run();

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [enabled, hiddenIntervalMs, intervalMs, isDocumentVisible, maxConsecutiveErrors]);
}
