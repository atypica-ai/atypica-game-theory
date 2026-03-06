import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useTaskDetailPolling } from "../src/app/(universal)/universal/components/task-detail/useTaskDetailPolling";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("useTaskDetailPolling", () => {
  afterEach(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("polls repeatedly while shouldContinue returns true", async () => {
    const fetcher = vi
      .fn<() => Promise<{ step: number }>>()
      .mockResolvedValueOnce({ step: 1 })
      .mockResolvedValueOnce({ step: 2 });
    const onData = vi.fn<(data: { step: number }) => void>();

    renderHook(() =>
      useTaskDetailPolling({
        enabled: true,
        fetcher,
        onData,
        shouldContinue: (data) => data.step < 2,
        intervalMs: 10,
      }),
      { reactStrictMode: false },
    );

    await waitFor(() => expect(onData).toHaveBeenCalledTimes(2), { timeout: 1000 });
  });

  it("uses hidden interval when document is not visible", async () => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });

    const fetcher = vi
      .fn<() => Promise<{ step: number }>>()
      .mockResolvedValueOnce({ step: 1 })
      .mockResolvedValueOnce({ step: 2 });

    renderHook(() =>
      useTaskDetailPolling({
        enabled: true,
        fetcher,
        onData: () => undefined,
        shouldContinue: (data) => data.step < 2,
        intervalMs: 5,
        hiddenIntervalMs: 500,
      }),
      { reactStrictMode: false },
    );

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1), { timeout: 1000 });
    await sleep(100);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("stops after max consecutive errors", async () => {
    const fetcher = vi.fn<() => Promise<{ ok: true }>>().mockRejectedValue(new Error("fail"));

    renderHook(() =>
      useTaskDetailPolling({
        enabled: true,
        fetcher,
        onData: () => undefined,
        intervalMs: 10,
        maxConsecutiveErrors: 3,
      }),
      { reactStrictMode: false },
    );

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3), { timeout: 1000 });
    await sleep(80);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
