import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { calculateStepTokensUsage } from "@/ai/usage";
import authOptions from "@/app/(auth)/authOptions";
import { rootLogger } from "@/lib/logging";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
} from "ai";
import { getServerSession } from "next-auth/next";
import { getLocale } from "next-intl/server";
import { after, NextResponse } from "next/server";
import {
  generateContentHash,
  readCachedContent,
  writeCachedContent,
} from "./cache";
import { getFormatContentSystemPrompt } from "./prompt";

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

  // Generate content hash
  const contentHash = generateContentHash(content);

  // Always try to read from cache first
  const cached = await readCachedContent(userId, contentHash);
  if (cached) {
    logger.info({ msg: "Returning cached content", hash: contentHash, live });

    // Return cached content as a stream
    const stream = createUIMessageStream({
      async execute({ writer }) {
        writer.write({ type: "start" });
        writer.write({ type: "text-start", id: contentHash });
        writer.write({ type: "text-delta", id: contentHash, delta: cached.formattedHtml });
        writer.write({ type: "text-end", id: contentHash });
        writer.write({ type: "finish" });
      },
    });

    return createUIMessageStreamResponse({ stream });
  }

  // If cache miss and not live mode, return empty stream (will fallback to plain text)
  if (!live) {
    logger.info({ msg: "Cache miss in replay mode, returning empty response", hash: contentHash });

    // Return empty stream so frontend will fallback to plain text
    const stream = createUIMessageStream({
      async execute({ writer }) {
        writer.write({ type: "start" });
        writer.write({ type: "finish" });
      },
    });

    return createUIMessageStreamResponse({ stream });
  }

  // Get locale from server
  const locale = await getLocale();

  // Get system prompt
  const systemPrompt = getFormatContentSystemPrompt(locale);

  // Build user message
  const userMessage =
    locale === "zh-CN"
      ? `请将以下内容格式化为结构化的 HTML：

${content}`
      : `Please format the following content into structured HTML:

${content}`;

  // Generate new content
  const result = streamText({
    model: llm("claude-sonnet-4-5"),
    providerOptions: defaultProviderOptions(),
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
    maxOutputTokens: 8000,
    stopWhen: stepCountIs(1),
    onFinish: async ({ usage, providerMetadata, text }) => {
      logger.info({ msg: "Format content completed", usage });
      const totalTokens = calculateStepTokensUsage({ usage, providerMetadata }).tokens;
      logger.info({ msg: "Token usage", totalTokens });

      // TODO: Deduct tokens from user account (for live mode)
      // if (live) {
      //   await deductTokens(userId, totalTokens);
      // }

      // Cache the result
      await writeCachedContent(userId, contentHash, {
        originalText: content,
        formattedHtml: text,
      });
    },
    onError: ({ error }) => {
      logger.error({ msg: "Format content error", error: (error as Error).message });
    },
  });

  after(result.consumeStream());

  return result.toUIMessageStreamResponse();
}
