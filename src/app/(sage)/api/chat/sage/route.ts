import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { initGenericUserChatStatReporter } from "@/ai/tools/stats";
import { calculateStepTokensUsage } from "@/ai/usage";
import authOptions from "@/app/(auth)/authOptions";
import { rootLogger } from "@/lib/logging";
import { detectInputLanguage } from "@/lib/textUtils";
import { prisma } from "@/prisma/prisma";
import { generateId, smoothStream, stepCountIs, streamText } from "ai";
import { getServerSession } from "next-auth";
import { after, NextResponse } from "next/server";
import { analyzeConversationForGaps, createSageKnowledgeGaps, getSageByToken } from "../../../lib";
import { sageChatSystem } from "../../../prompt";
import { KnowledgeGapSourceType } from "../../../types";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const payload = await req.json();
  const parseResult = clientMessagePayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    return NextResponse.json({ error }, { status: 400 });
  }

  const { message: newMessage, userChatToken, attachments: newAttachments } = parseResult.data;

  if (!userChatToken || !newMessage) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Get UserChat
  const userChat = await prisma.userChat.findUnique({
    where: { token: userChatToken },
    include: {
      sageChat: {
        include: {
          sage: true,
        },
      },
    },
  });

  if (!userChat || !userChat.sageChat) {
    return NextResponse.json({ error: "Chat session not found" }, { status: 404 });
  }

  // Check access permission
  if (userChat.userId !== session.user.id) {
    const sage = userChat.sageChat.sage;
    // Check if sage is public
    if (!sage.isPublic) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  const result = await getSageByToken(userChat.sageChat.sage.token);
  if (!result) {
    return NextResponse.json({ error: "Sage not found" }, { status: 404 });
  }

  const { sage, memoryDocument } = result;

  // Check if Memory Document is ready
  if (!memoryDocument) {
    return NextResponse.json(
      { error: "Sage is still being processed. Please try again later." },
      { status: 503 },
    );
  }

  const chatLogger = rootLogger.child({
    userChatId: userChat.id,
    userChatToken: userChat.token,
    sageId: sage.id,
    intent: "SageChat",
  });

  // Initialize stats reporter
  const { statReport } = initGenericUserChatStatReporter({
    userId: session.user.id,
    userChatId: userChat.id,
    logger: chatLogger,
  });

  // Save the latest user message to database
  await persistentAIMessageToDB({
    userChatId: userChat.id,
    message: {
      ...newMessage,
      id: newMessage.id ?? generateId(),
    },
    attachments: newAttachments,
  });

  // Detect user input language, fallback to sage's locale
  const locale = await detectInputLanguage({
    text: newMessage.parts.map((part) => (part.type === "text" ? part.text : "")).join(""),
    fallbackLocale: sage.locale as "zh-CN" | "en-US",
  });

  // Setup tools based on sage's allowTools setting
  const tools = sage.allowTools
    ? {
        // TODO: 这个回头再实现，暂时不搞这么复杂
        // google_search: google.tools.googleSearch({
        //   mode: "MODE_DYNAMIC",
        //   dynamicThreshold: 0.3,
        // }),
        // [ToolName.reasoningThinking]: reasoningThinkingTool(),
      }
    : {};

  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(userChat.id, {
    tools,
  });

  const mergedAbortSignal = AbortSignal.any([req.signal]);

  const streamTextResult = streamText({
    model: llm("claude-sonnet-4"),
    providerOptions: defaultProviderOptions,

    system: sageChatSystem({
      sage: {
        name: sage.name,
        domain: sage.domain,
        allowTools: sage.allowTools,
      },
      memoryDocument,
      locale,
    }),
    messages: coreMessages,

    tools,

    stopWhen: stepCountIs(3),

    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),

    abortSignal: mergedAbortSignal,

    onStepFinish: async (step) => {
      appendStepToStreamingMessage(streamingMessage, step);
      if (streamingMessage.parts?.length) {
        await persistentAIMessageToDB({
          userChatId: userChat.id,
          message: streamingMessage,
        });
      }
      const { tokens, extra } = calculateStepTokensUsage(step);
      chatLogger.info({
        msg: "sage chat streamText onStepFinish",
        usage: extra.usage,
        cache: extra.cache,
      });
      if (statReport) {
        await statReport("tokens", tokens, {
          reportedBy: "sage chat",
          ...extra,
        });
      }
    },

    onError: ({ error }) => {
      chatLogger.error(`sage chat streamText onError: ${(error as Error).message}`);
    },
  });

  after(
    new Promise((resolve, reject) => {
      streamTextResult
        .consumeStream()
        .then(async () => {
          // Analyze conversation for knowledge gaps
          try {
            const userMessage = newMessage.parts
              .filter((part) => part.type === "text")
              .map((part) => part.text)
              .join("\n");

            const aiMessage = streamingMessage.parts
              ?.filter((part) => part.type === "text")
              .map((part) => part.text)
              .join("\n") || "";

            if (userMessage && aiMessage) {
              const gaps = await analyzeConversationForGaps({
                userMessage,
                aiResponse: aiMessage,
                sage: { name: sage.name, domain: sage.domain },
                locale,
              });

              if (gaps.length > 0) {
                // Create knowledge gap records with conversation source
                await createSageKnowledgeGaps(
                  gaps.map((gap) => ({
                    sageId: sage.id,
                    area: gap.area,
                    description: gap.description,
                    severity: gap.severity,
                    impact: gap.impact,
                    sourceType: KnowledgeGapSourceType.CONVERSATION,
                    sourceDescription: `User asked: "${userMessage.substring(0, 100)}${userMessage.length > 100 ? "..." : ""}"`,
                    sourceReference: userChat.token,
                  }))
                );
                chatLogger.info({
                  msg: "Detected knowledge gaps from conversation",
                  gapsCount: gaps.length,
                });
              }
            }
          } catch (error) {
            chatLogger.error({
              msg: "Failed to analyze conversation for gaps",
              error: (error as Error).message,
            });
          }

          resolve(null);
        })
        .catch((error) => {
          reject(error);
        });
    }),
  );

  // Update chat count and last active time
  await prisma.sage.update({
    where: { id: sage.id },
    data: {
      chatCount: { increment: 1 },
      lastActiveAt: new Date(),
    },
  });

  // Update message count
  await prisma.sageChat.update({
    where: { id: userChat.sageChat.id },
    data: {
      messageCount: { increment: 1 },
    },
  });

  return streamTextResult.toUIMessageStreamResponse({
    generateMessageId: () => streamingMessage.id,
  });
}
