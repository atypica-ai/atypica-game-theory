import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { calculateStepTokensUsage } from "@/ai/usage";
import authOptions from "@/app/(auth)/authOptions";
import { rootLogger } from "@/lib/logging";
import { stepCountIs, streamText } from "ai";
import { getServerSession } from "next-auth/next";
import { getLocale } from "next-intl/server";
import { after, NextResponse } from "next/server";
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
  logger.info({ msg: "Formatting content", contentLength: content.length });

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
    onFinish: async ({ usage, providerMetadata }) => {
      logger.info({ msg: "Format content completed", usage });
      const totalTokens = calculateStepTokensUsage({ usage, providerMetadata }).tokens;
      logger.info({ msg: "Token usage", totalTokens });
    },
    onError: ({ error }) => {
      logger.error({ msg: "Format content error", error: (error as Error).message });
    },
  });

  after(result.consumeStream());

  return result.toUIMessageStreamResponse();
}
