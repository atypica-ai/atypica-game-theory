import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { handleToolCallError } from "@/ai/tools/error";
import { initGenericUserChatStatReporter } from "@/ai/tools/stats";
import { calculateStepTokensUsage } from "@/ai/usage";
import authOptions from "@/app/(auth)/authOptions";
import { loadTeamMemory, loadUserMemory } from "@/app/(memory)/lib/loadMemory";
import { buildMemoryUsagePrompt } from "@/app/(memory)/prompt/memoryUsage";
import { buildUniversalSystemPrompt } from "@/app/(universal)/prompt";
import { buildUniversalTools } from "@/app/(universal)/tools";
import { rootLogger } from "@/lib/logging";
import { detectInputLanguage } from "@/lib/textUtils";
import { prisma } from "@/prisma/prisma";
import { getUserTokens } from "@/tokens/lib";
import { generateId, smoothStream, stepCountIs, streamText } from "ai";
import { getServerSession } from "next-auth/next";
import type { Locale } from "next-intl";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // Parse request payload
  const payload = await req.json();
  const parseResult = clientMessagePayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    return NextResponse.json({ error }, { status: 400 });
  }
  const { message: newMessage, userChatToken } = parseResult.data;

  // Find and validate userChat
  const userChat = await prisma.userChat.findUnique({
    where: {
      token: userChatToken,
      kind: "universal",
    },
  });

  if (!userChat) {
    return NextResponse.json({ error: "UserChat not found" }, { status: 404 });
  }

  if (userChat.userId !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const universalChatId = userChat.id;
  const logger = rootLogger.child({ universalChatId, userChatToken: userChat.token });

  // Initialize stat reporter
  const { statReport } = initGenericUserChatStatReporter({
    userId,
    userChatId: universalChatId,
    logger,
  });

  // Persist new message to database
  await persistentAIMessageToDB({
    userChatId: universalChatId,
    message: {
      ...newMessage,
      id: newMessage.id ?? generateId(),
    },
  });

  // Detect input language
  const locale: Locale = await detectInputLanguage({
    text: newMessage.parts.map((part) => (part.type === "text" ? part.text : "")).join(""),
  });

  // Get user and team info
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });
  const teamId = user.teamIdAsMember;

  // Check token balance
  const { balance } = await getUserTokens({ userId });
  if (balance !== "Unlimited" && balance <= 0) {
    return NextResponse.json(
      { error: "Insufficient tokens. Please purchase more tokens to continue." },
      { status: 402 },
    );
  }

  // Build system prompt with memory
  const memory = teamId ? await loadTeamMemory(teamId) : await loadUserMemory(userId);
  const baseSystemPrompt = await buildUniversalSystemPrompt({
    userId,
    locale,
    userMemory: memory,
  });
  const memoryUsagePrompt = buildMemoryUsagePrompt({ userMemory: memory, locale });
  const systemPrompt = `${baseSystemPrompt}\n\n${memoryUsagePrompt}`;

  // Build tools
  const abortController = new AbortController();
  const tools = buildUniversalTools({
    userId,
    locale,
    abortSignal: abortController.signal,
    statReport,
    logger,
  });

  // Load messages
  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(universalChatId, {
    tools,
  });

  // Stream text
  const result = streamText({
    model: llm("claude-sonnet-4-5"),
    ...defaultProviderOptions,
    system: systemPrompt,
    messages: coreMessages,
    tools,
    stopWhen: stepCountIs(50),
    experimental_repairToolCall: handleToolCallError,
    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),
    onStepFinish: async (step) => {
      // Save AI response to database
      appendStepToStreamingMessage(streamingMessage, step);
      if (streamingMessage.parts?.length) {
        await persistentAIMessageToDB({
          userChatId: universalChatId,
          message: streamingMessage,
        });
      }

      // Track token usage
      const { tokens, extra } = calculateStepTokensUsage(step);
      statReport("tokens", tokens, {
        reportedBy: "universal",
        userId,
        ...extra,
      });
    },
    onError: ({ error }) => {
      logger.error({
        msg: "Universal agent stream error",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
