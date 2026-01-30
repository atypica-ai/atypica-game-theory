import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import { llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import authOptions from "@/app/(auth)/authOptions";
import { sageInterviewConversationSystem } from "@/app/(sage)/prompt/chat";
import {
  type SageExtra,
  type SageInterviewExtra,
  SageKnowledgeGapSeverity,
} from "@/app/(sage)/types";
import { VALID_LOCALES } from "@/i18n/routing";
import { rootLogger } from "@/lib/logging";
import { detectInputLanguage } from "@/lib/textUtils";
import { Sage, SageInterview } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { type AnthropicProviderOptions } from "@ai-sdk/anthropic";
import { generateId, smoothStream, stepCountIs, streamText, tool } from "ai";
import { getServerSession } from "next-auth";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { after, NextResponse } from "next/server";
import z from "zod";

// Tool schemas
const fetchPendingGapsOutputSchema = z.object({
  gaps: z.array(
    z.object({
      id: z.number(),
      area: z.string(),
      description: z.string(),
      severity: z.enum([
        SageKnowledgeGapSeverity.CRITICAL,
        SageKnowledgeGapSeverity.IMPORTANT,
        SageKnowledgeGapSeverity.NICE_TO_HAVE,
      ]),
      impact: z.string(),
    }),
  ),
  totalCount: z.number(),
  plainText: z.string(), // Required for PlainTextToolResult
});

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

  // Get UserChat and interview
  const userChat = await prisma.userChat.findUnique({
    where: {
      token: userChatToken,
      userId: session.user.id, // 校验一下，只有专家本人可以
    },
    select: {
      id: true,
      token: true,
      sageInterview: {
        select: {
          id: true,
          extra: true,
          sage: {
            select: {
              id: true,
              name: true,
              domain: true,
              expertise: true,
              locale: true,
              extra: true,
            },
          },
        },
      },
    },
  });

  if (!userChat || !userChat.sageInterview) {
    return NextResponse.json({ error: "Interview session not found" }, { status: 404 });
  }

  const { sage, ...sageInterview } = userChat.sageInterview as Pick<SageInterview, "id"> & {
    extra: SageInterviewExtra;
  } & {
    sage: Pick<Sage, "id" | "name" | "domain" | "locale"> & {
      expertise: string[];
      extra: SageExtra;
    };
  };

  // Check if interview is completed
  if (!sageInterview.extra.ongoing) {
    return NextResponse.json({ error: "Interview has been completed" }, { status: 400 });
  }

  const logger = rootLogger.child({
    userChatId: userChat.id,
    userChatToken: userChat.token,
    sageId: sage.id,
    interviewId: sageInterview.id,
    intent: "SageInterview",
  });

  // Initialize stats reporter (use sage creator's account)
  // const { statReport } = initGenericUserChatStatReporter({
  //   userId: sage.userId,
  //   userChatId: userChat.id,
  //   logger: logger,
  // });
  const statReport: StatReporter = (async (dimension, value, extra) => {
    rootLogger.info({
      msg: `[LIMITED FREE] statReport: ${dimension}=${value}`,
      extra,
      note: "sage interview is currently free - tokens not deducted",
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
    fallbackLocale: VALID_LOCALES.includes(sage.locale as Locale)
      ? (sage.locale as Locale)
      : await getLocale(),
  });

  const FETCH_PENDING_GAPS = "fetchPendingGaps";
  // Define tools for interview
  const tools = {
    [FETCH_PENDING_GAPS]: tool({
      description:
        "Fetch pending knowledge gaps to understand what knowledge needs to be filled in this interview. Use this tool at the beginning of the interview to see what gaps need to be addressed.",
      inputSchema: z.object({}),
      outputSchema: fetchPendingGapsOutputSchema,
      toModelOutput: (result) => {
        return { type: "text", value: result.plainText };
      },
      execute: async () => {
        const gaps = await prisma.sageKnowledgeGap.findMany({
          where: {
            sageId: sage.id,
            resolvedAt: null,
          },
          select: {
            id: true,
            area: true,
            description: true,
            severity: true,
            impact: true,
          },
          orderBy: [{ severity: "desc" }, { id: "asc" }],
        });

        const gapsText =
          gaps.length > 0
            ? gaps
                .map(
                  (gap, idx) =>
                    `${idx + 1}. [${gap.severity.toUpperCase()}] ${gap.area}\n   Description: ${gap.description}\n   Impact: ${gap.impact}`,
                )
                .join("\n\n")
            : "No pending knowledge gaps found.";

        return {
          gaps: gaps.map((gap) => ({
            id: gap.id,
            area: gap.area,
            description: gap.description,
            severity: gap.severity as SageKnowledgeGapSeverity,
            impact: gap.impact,
          })),
          totalCount: gaps.length,
          plainText: `Found ${gaps.length} pending knowledge gap(s) that need to be filled:\n\n${gapsText}`,
        };
      },
    }),
  };

  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(userChat.id, {
    tools,
  });

  const mergedAbortSignal = AbortSignal.any([req.signal]);

  const streamTextResult = streamText({
    model: llm("claude-haiku-4-5"),
    // providerOptions: defaultProviderOptions,
    providerOptions: {
      anthropic: {
        thinking: {
          type: "enabled", // 如果不设置或者 disable，在复杂的情况下 haiku 会输出 <thinking> 区块
          budgetTokens: 3000,
        },
      } satisfies AnthropicProviderOptions,
    },

    stopWhen: stepCountIs(3),
    prepareStep: async ({ messages }) => {
      let pendingGapsFetched = false;
      for (const message of messages) {
        if (message.role === "tool") {
          for (const part of message.content) {
            if (part.toolName === FETCH_PENDING_GAPS) {
              pendingGapsFetched = true;
            }
          }
        }
      }
      if (!pendingGapsFetched) {
        // claude-haiku-4-5 有个限制，Thinking may not be enabled when tool_choice forces tool use.
        // 所以这里不能用 required 要用 auto
        return {
          activeTools: [FETCH_PENDING_GAPS],
          toolChoice: "auto",
        };
      } else {
        return {
          activeTools: [],
          toolChoice: "none",
        };
      }
    },

    tools,

    system: sageInterviewConversationSystem({
      sage: {
        name: sage.name,
        domain: sage.domain,
        expertise: sage.expertise,
      },
      locale,
    }),
    messages: coreMessages,

    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),

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
      logger.info({
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
      logger.error(`sage interview streamText onError: ${(error as Error).message}`);
    },

    abortSignal: mergedAbortSignal,
  });

  after(streamTextResult.consumeStream());

  return streamTextResult.toUIMessageStreamResponse({
    generateMessageId: () => streamingMessage.id,
  });
}
