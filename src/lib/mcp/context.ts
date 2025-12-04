import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { McpRequestContext } from "./types";

/**
 * AsyncLocalStorage to store request context per async execution.
 *
 * Note: The MCP SDK provides transport, requestId, and progressToken through
 * the `extra` parameter in tool handlers. We only use AsyncLocalStorage to
 * store userId, which is application-specific and not provided by the SDK.
 */
const requestContextStorage = new AsyncLocalStorage<McpRequestContext>();

/**
 * Gets the current request context (userId).
 * Returns undefined if called outside of a request context.
 */
export function getMcpRequestContext(): McpRequestContext | undefined {
  return requestContextStorage.getStore();
}

/**
 * Runs a function within a request context.
 * This should be called from the route handler before handling the request.
 *
 * @param context - The request context containing userId
 * @param fn - The function to run within the context
 */
export async function runWithMcpRequestContext<T>(
  context: McpRequestContext,
  fn: () => Promise<T>,
): Promise<T> {
  return requestContextStorage.run(context, fn);
}
