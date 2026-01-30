import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { reasoningThinkingTool } from "@/ai/tools/tools";
import { BasicToolName, StatReporter } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import authOptions from "@/app/(auth)/authOptions";
import { sageChatSystemPrompt } from "@/app/(sage)/prompt/chat";
import { SageAvatar, SageExtra } from "@/app/(sage)/types";
import { rootLogger } from "@/lib/logging";
import { detectInputLanguage } from "@/lib/textUtils";
import { prisma } from "@/prisma/prisma";
import { google } from "@ai-sdk/google";
import { generateId, smoothStream, stepCountIs, streamText } from "ai";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

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
    where: {
      token: userChatToken,
      userId: session.user.id, // ensure user owns the chat
    },
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

  // Get sage with memory document
  const sageToken = userChat.sageChat.sage?.token;
  if (!sageToken) {
    return NextResponse.json({ error: "Sage token not found" }, { status: 404 });
  }

  const sageData = await prisma.sage.findUnique({
    where: { token: sageToken },
    include: {
      memoryDocuments: {
        orderBy: { version: "desc" },
        take: 1,
        select: { core: true, working: true },
      },
    },
  });

  if (!sageData) {
    return NextResponse.json({ error: "Sage not found" }, { status: 404 });
  }

  const sage = {
    ...sageData,
    expertise: sageData.expertise as string[],
    extra: sageData.extra as SageExtra,
    avatar: sageData.avatar as SageAvatar,
  };

  const latestMemoryDoc = sageData.memoryDocuments[0];

  // Check if Memory Document is ready
  if (!latestMemoryDoc || !latestMemoryDoc.core) {
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
  // const { statReport } = initGenericUserChatStatReporter({
  //   userId: session.user.id,
  //   userChatId: userChat.id,
  //   logger: chatLogger,
  // });
  const statReport: StatReporter = (async (dimension, value, extra) => {
    rootLogger.info({
      msg: `[LIMITED FREE] statReport: ${dimension}=${value}`,
      extra,
      note: "sage chat is currently free - tokens not deducted",
    });
  }) satisfies StatReporter;

  // Save the latest user message to database
  await persistentAIMessageToDB({
    mode: "append",
    userChatId: userChat.id,
    message: {
      id: newMessage.id ?? generateId(),
      role: newMessage.role,
      parts: [newMessage.lastPart],
      metadata: newMessage.metadata,
    },
    attachments: newAttachments,
  });

  // Detect user input language, fallback to sage's locale
  const locale = await detectInputLanguage({
    text: newMessage.lastPart.type === "text" ? newMessage.lastPart.text : "",
    fallbackLocale: sage.locale as "zh-CN" | "en-US",
  });

  const mergedAbortSignal = AbortSignal.any([req.signal]);

  const tools = {
    google_search: google.tools.googleSearch({
      mode: "MODE_DYNAMIC",
      dynamicThreshold: 0.3,
    }),
    [BasicToolName.reasoningThinking]: reasoningThinkingTool({
      locale,
      abortSignal: mergedAbortSignal,
      statReport,
      logger: chatLogger,
    }),
  };

  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(userChat.id, {
    tools,
  });

  const streamTextResult = streamText({
    // model: llm("claude-sonnet-4"),
    model: llm("gemini-2.5-flash"),
    providerOptions: defaultProviderOptions,

    system: sageChatSystemPrompt({
      sage: {
        name: sage.name,
        domain: sage.domain,
      },
      coreMemory: latestMemoryDoc.core,
      workingMemory: Array.isArray(latestMemoryDoc.working)
        ? (latestMemoryDoc.working as Array<{ content: string }>).map((item) => item.content)
        : [],
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
          mode: "override",
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

  // No after() processing needed - gaps are analyzed manually by the expert in batch

  return streamTextResult.toUIMessageStreamResponse({
    generateMessageId: () => streamingMessage.id,
  });
}
