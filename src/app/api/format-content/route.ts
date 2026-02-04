import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import authOptions from "@/app/(auth)/authOptions";
import { rootLogger } from "@/lib/logging";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { getServerSession } from "next-auth/next";
import { getLocale } from "next-intl/server";
import { NextResponse } from "next/server";
import { generateContentHash } from "./cache";
import { formatContentCore } from "./core";

/**
 * POST /api/format-content
 *
 * Format long text content into structured HTML
 *
 * Request body: ClientMessagePayload
 *
 * Response: Text stream of formatted HTML
 */
export async function POST(req: Request) {
  const logger = rootLogger.child({ api: "format-content" });

  // Authentication check
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Get live parameter from URL query
  const { searchParams } = new URL(req.url);
  const liveParam = searchParams.get("live");
  const live = liveParam === "true";

  // Parse request with schema
  const payload = await req.json();
  const parseResult = clientMessagePayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    logger.warn({ msg: "Invalid request body", error });
    return NextResponse.json({ error }, { status: 400 });
  }

  const { message: newMessage } = parseResult.data;

  // Extract text from lastPart
  const lastPart = newMessage.lastPart;
  if (lastPart.type !== "text" || !("text" in lastPart)) {
    logger.warn({ msg: "Invalid message: lastPart is not text" });
    return NextResponse.json({ error: "Invalid message: text is required" }, { status: 400 });
  }

  const content = lastPart.text;
  logger.info({ msg: "Formatting content", contentLength: content.length, live });

  // Get locale from server
  const locale = await getLocale();
  const contentHash = generateContentHash(content);

  // Unified stream - all logic in one place
  const stream = createUIMessageStream({
    async execute({ writer }) {
      const maxAttempts = 60; // 5 minutes = 300s = 60 * 5 second interval
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Call formatContentCore
        const result = await formatContentCore(
          { content, locale, userId, triggeredBy: "frontend", live },
          writer,
        );
        if (result.status === "processing") {
          // Another instance is processing, wait and retry
          logger.info({ msg: "Processing by another instance, waiting...", attempt: attempt + 1 });
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        } else if (result.status === "cached") {
          // formatContentCore found cache - write it to stream and finish
          writer.write({ type: "start" });
          writer.write({ type: "text-start", id: contentHash });
          writer.write({ type: "text-delta", id: contentHash, delta: result.formattedHtml ?? "" });
          writer.write({ type: "text-end", id: contentHash });
          writer.write({ type: "finish" });
          return;
        } else if (result.status === "failed") {
          // Error occurred, write empty finish
          logger.error({ msg: "Format content failed", error: result.error });
          writer.write({ type: "start" });
          writer.write({ type: "finish" });
          return;
        } else {
          // result.status === "generated"
          // formatContentCore already wrote to stream via writer, we're done
          return;
        }
      }
      // Timeout - give up
      logger.warn({ msg: "Timeout waiting for processing completion", hash: contentHash });
      writer.write({ type: "start" });
      writer.write({ type: "finish" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
