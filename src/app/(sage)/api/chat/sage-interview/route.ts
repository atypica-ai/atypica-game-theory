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
import { generateId, smoothStream, streamText } from "ai";
import { getServerSession } from "next-auth";
import { after, NextResponse } from "next/server";
import { getSageById } from "../../../lib";
import { sageInterviewConversationSystem } from "../../../prompt";
import { sageInterviewTools } from "../../../tools";
import type { SageInterviewExtra } from "../../../types";

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

  const {
    message: newMessage,
    userChatToken,
    attachments: newAttachments,
  } = parseResult.data;

  if (!userChatToken || !newMessage) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Get UserChat and interview
  const userChat = await prisma.userChat.findUnique({
    where: { token: userChatToken },
    include: {
      sageInterview: {
        include: {
          sage: true,
        },
      },
    },
  });

  if (!userChat || !userChat.sageInterview) {
    return NextResponse.json({ error: "Interview session not found" }, { status: 404 });
  }

  const interview = userChat.sageInterview;

  // Check ownership
  if (interview.sage.userId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Check if interview is completed
  if (interview.status === "completed") {
    return NextResponse.json(
      { error: "Interview has been completed" },
      { status: 400 }
    );
  }

  const result = await getSageById(interview.sageId);
  if (!result) {
    return NextResponse.json({ error: "Sage not found" }, { status: 404 });
  }

  const { sage } = result;

  const chatLogger = rootLogger.child({
    userChatId: userChat.id,
    userChatToken: userChat.token,
    sageId: sage.id,
    interviewId: interview.id,
    intent: "SageInterview",
  });

  // Initialize stats reporter (use sage creator's account)
  const { statReport } = initGenericUserChatStatReporter({
    userId: sage.userId,
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
    text: newMessage.parts
      .map((part) => (part.type === "text" ? part.text : ""))
      .join(""),
    fallbackLocale: sage.locale as "zh-CN" | "en-US",
  });

  // Get interview plan from extra
  const interviewExtra = interview.extra as SageInterviewExtra;
  const interviewPlan = interviewExtra.interviewPlan || {
    purpose: interview.purpose,
    focusAreas: interview.focusAreas as string[],
    questions: [],
  };

  // Setup tools
  const tools = sageInterviewTools({ interviewId: interview.id });

  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(userChat.id, {
    tools,
  });

  const mergedAbortSignal = AbortSignal.any([req.signal]);

  const streamTextResult = streamText({
    model: llm("claude-sonnet-4"),
    providerOptions: defaultProviderOptions,

    system: sageInterviewConversationSystem({
      sage: {
        name: sage.name,
        domain: sage.domain,
      },
      interviewPlan,
      locale,
    }),
    messages: coreMessages,

    tools,

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
        msg: "sage interview streamText onStepFinish",
        usage: extra.usage,
        cache: extra.cache,
        toolCalls: step.toolCalls.map((call) => call.toolName),
      });
      if (statReport) {
        await statReport("tokens", tokens, {
          reportedBy: "sage interview",
          ...extra,
        });
      }
    },

    onError: ({ error }) => {
      chatLogger.error(`sage interview streamText onError: ${(error as Error).message}`);
    },
  });

  after(
    new Promise((resolve, reject) => {
      streamTextResult
        .consumeStream()
        .then(() => {
          resolve(null);
        })
        .catch((error) => {
          reject(error);
        });
    }),
  );

  return streamTextResult.toUIMessageStreamResponse({
    generateMessageId: () => streamingMessage.id,
  });
}
