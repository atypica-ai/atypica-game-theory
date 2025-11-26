import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { MCPRequestContext } from "./types";

/**
 * AsyncLocalStorage to store request context per async execution
 * This ensures each request has its own transport reference
 */
const requestContextStorage = new AsyncLocalStorage<MCPRequestContext>();

/**
 * Gets the current request context (transport and request ID)
 * Returns undefined if called outside of a request context
 */
export function getMCPRequestContext(): MCPRequestContext | undefined {
  return requestContextStorage.getStore();
}

/**
 * Runs a function within a request context
 * This should be called from the route handler before handling the request
 */
export async function runWithMCPRequestContext<T>(
  context: MCPRequestContext,
  fn: () => Promise<T>,
): Promise<T> {
  return requestContextStorage.run(context, fn);
}

