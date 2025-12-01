import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { MCPRequestContext } from "./types";

/**
 * AsyncLocalStorage to store request context per async execution.
 * 
 * Note: The MCP SDK provides transport, requestId, and progressToken through
 * the `extra` parameter in tool handlers. We only use AsyncLocalStorage to
 * store userId, which is application-specific and not provided by the SDK.
 */
const requestContextStorage = new AsyncLocalStorage<MCPRequestContext>();

/**
 * Gets the current request context (userId).
 * Returns undefined if called outside of a request context.
 */
export function getMCPRequestContext(): MCPRequestContext | undefined {
  return requestContextStorage.getStore();
}

/**
 * Runs a function within a request context.
 * This should be called from the route handler before handling the request.
 * 
 * @param context - The request context containing userId
 * @param fn - The function to run within the context
 */
export async function runWithMCPRequestContext<T>(
  context: MCPRequestContext,
  fn: () => Promise<T>,
): Promise<T> {
  return requestContextStorage.run(context, fn);
}

