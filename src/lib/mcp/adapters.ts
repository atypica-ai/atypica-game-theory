import "server-only";

import { rootLogger } from "@/lib/logging";
import { IncomingMessage, ServerResponse } from "http";
import { NextRequest } from "next/server";
import { Readable } from "stream";

const logger = rootLogger.child({ module: "mcp-adapters" });

/**
 * Converts Next.js Request to Node.js IncomingMessage-like object
 * This is needed because StreamableHTTPServerTransport expects Node.js HTTP objects
 */
export async function createMcpIncomingMessage(req: NextRequest): Promise<IncomingMessage> {
  const incomingMessage = new Readable({
    read() {},
  }) as unknown as IncomingMessage;

  // Copy headers
  const headers: Record<string, string | string[]> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });
  incomingMessage.headers = headers;
  incomingMessage.url = req.url;
  incomingMessage.method = req.method;

  return incomingMessage;
}

/**
 * Creates a ServerResponse-like object that can stream SSE or return JSON
 * This bridges Next.js Response with Node.js ServerResponse for StreamableHTTPServerTransport
 */
export function createMcpServerResponse(): {
  res: ServerResponse;
  getStreamingResponse: () => ReadableStream;
  getHeaders: () => Record<string, string>;
  getStatusCode: () => number;
} {
  let statusCode = 200;
  const headers: Record<string, string> = {};
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController | null = null;
  let headersSent = false;

  // Create a ReadableStream that will be populated by ServerResponse writes
  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
    },
    cancel() {
      controller = null;
    },
  });

  const res = {
    statusCode,
    headersSent: false,

    setHeader(name: string, value: string) {
      if (!headersSent) {
        headers[name.toLowerCase()] = value;
      }
    },

    getHeader(name: string) {
      return headers[name.toLowerCase()];
    },

    writeHead(code: number, headersArg?: Record<string, string>) {
      statusCode = code;
      if (headersArg) {
        Object.entries(headersArg).forEach(([key, value]) => {
          headers[key.toLowerCase()] = value;
        });
      }
      headersSent = true;
      return res;
    },

    flushHeaders() {
      headersSent = true;
      return res;
    },

    write(chunk: Uint8Array | string): boolean {
      if (!controller) return false;

      try {
        const data = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
        controller.enqueue(data);
        return true;
      } catch (error) {
        logger.error({ msg: "Error writing chunk to stream", error: (error as Error).message });
        return false;
      }
    },

    end(chunk?: Uint8Array | string) {
      if (chunk) {
        res.write(chunk);
      }
      if (controller) {
        controller.close();
        controller = null;
      }
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    on(event: string, handler: () => void) {
      // Minimal event emitter implementation
      return res;
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    once(event: string, handler: () => void) {
      return res;
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    emit(event: string) {
      return false;
    },
  } as unknown as ServerResponse;

  return {
    res,
    getStreamingResponse: () => stream,
    getHeaders: () => headers,
    getStatusCode: () => statusCode,
  };
}
