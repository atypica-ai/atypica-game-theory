import "server-only";

/**
 * In-memory Promise signaling for human player input.
 *
 * The orchestration loop (running in `after()`) and server actions (handling
 * HTTP requests) execute in the same Next.js process. Instead of polling the
 * database every second, we use a simple in-memory resolver map:
 *
 *   1. Orchestration calls `waitForHumanSignal(requestId, timeoutMs)`
 *      → registers a Promise and waits
 *   2. Server action calls `signalHumanInput(requestId, content)`
 *      → resolves the Promise instantly
 *
 * If the process restarts, the pending Promise is lost — but the orchestration
 * loop (which runs in `after()`) is also lost, so there's no orphan.
 */

const pending = new Map<
  string,
  { resolve: (content: string | Record<string, unknown>) => void }
>();

/**
 * Called by orchestration: waits for human input or returns null on timeout.
 */
export function waitForHumanSignal(
  requestId: string,
  timeoutMs: number,
): Promise<string | Record<string, unknown> | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      resolve(null);
    }, timeoutMs);

    pending.set(requestId, {
      resolve: (content) => {
        clearTimeout(timer);
        pending.delete(requestId);
        resolve(content);
      },
    });
  });
}

/**
 * Called by server action: wakes the orchestration loop instantly.
 * Returns true if a pending request was found and resolved.
 */
export function signalHumanInput(
  requestId: string,
  content: string | Record<string, unknown>,
): boolean {
  const entry = pending.get(requestId);
  if (!entry) return false;
  entry.resolve(content);
  return true;
}
