import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { interviewSessionSystem } from "@/ai/prompt";
import { llm, providerOptions } from "@/ai/provider";
import { reasoningThinkingTool } from "@/ai/tools/experts/reasoning";
import { initInterviewProjectStatReporter } from "@/ai/tools/stats";
import { saveInterviewSessionSummaryTool } from "@/ai/tools/tools";
import { ToolName } from "@/ai/tools/types";
import { fetchCollectInterviewSession } from "@/app/(interviewProject)/legacy/interviewProject/actions";
import { rootLogger } from "@/lib/logging";
import { createUserChat } from "@/lib/userChat/lib";
import { generateToken } from "@/lib/utils";
import { prisma } from "@/prisma/prisma";
import { generateId, smoothStream, streamText } from "ai";
import { getLocale } from "next-intl/server";
import { after, NextRequest, NextResponse } from "next/server";
import { CollectSessionBodySchema } from "../lib";

// export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const parseResult = CollectSessionBodySchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    return NextResponse.json({ error }, { status: 400 });
  }

  const locale = await getLocale();

  const { message: newMessage, sessionToken } = parseResult.data;
  const result = await fetchCollectInterviewSession(sessionToken);
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  const interviewSession = result.data;
  // Check if session is expired
  if (interviewSession.expiresAt && new Date() > new Date(interviewSession.expiresAt)) {
    const error = { message: "Interview session has expired." };
    return Response.json({ error }, { status: 403 });
  }
  const { userId } = await prisma.interviewProject.findUniqueOrThrow({
    where: { id: interviewSession.projectId },
  });

  let userChatId: number;

  // First message in a collect session? Create UserChat
  if (!interviewSession.userChatId) {
    const userChat = await prisma.$transaction(async (tx) => {
      const userChat = await createUserChat({
        userId: userId, // Owned by the project creator
        title: `Shared: ${interviewSession.title}`,
        kind: "interviewSession",
        token: generateToken(),
        tx,
      });
      await tx.interviewSession.update({
        where: { id: interviewSession.id },
        data: {
          userChatId: userChat.id,
          status: "active",
        },
      });
      return userChat;
    });
    userChatId = userChat.id;
  } else {
    userChatId = interviewSession.userChatId;
  }

  // 无需再继续检查，可以直接安全的保存和读取 userChat.messages
  await persistentAIMessageToDB(userChatId, {
    ...newMessage,
    id: newMessage.id ?? generateId(),
  });
  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(userChatId);

  const abortSignal = req.signal;
  const projectLogger = rootLogger.child({
    interviewProjectId: interviewSession.projectId,
    sessionUserChatId: interviewSession.userChatId,
    sessionToken: interviewSession.token,
    sessionKind: interviewSession.kind,
  });
  const { statReport } = initInterviewProjectStatReporter({
    userId,
    interviewProjectId: interviewSession.projectId,
    sessionUserChatId: userChatId,
    logger: projectLogger,
  });

  // Generate system message with project context
  const systemPrompt = interviewSession.project.collectSystem
    ? interviewSession.project.collectSystem
    : interviewSessionSystem({
        projectTitle: interviewSession.project.title,
        projectBrief: interviewSession.project.brief,
        projectCategory: interviewSession.project.category,
        objectives: interviewSession.project.objectives,
        sessionKind: "collect",
      });

  // Generate response from LLM
  const streamTextResult = streamText({
    model: llm("claude-3-7-sonnet"),
    providerOptions,
    system: systemPrompt,
    messages: coreMessages,
    tools: {
      [ToolName.reasoningThinking]: reasoningThinkingTool({
        locale,
        abortSignal,
        statReport,
        logger: projectLogger,
      }),
      [ToolName.saveInterviewSessionSummary]: saveInterviewSessionSummaryTool({
        sessionId: interviewSession.id,
      }),
    },
    toolChoice: "auto",
    maxSteps: 5,
    temperature: 0.7,
    experimental_generateMessageId: () => streamingMessage.id,
    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),
    onStepFinish: async (step) => {
      appendStepToStreamingMessage(streamingMessage, step);
      if (streamingMessage.parts?.length && streamingMessage.content.trim()) {
        await persistentAIMessageToDB(userChatId, streamingMessage);
      }
      projectLogger.info({
        msg: "collect session streamText onStepFinish",
        stepType: step.stepType,
        toolCalls: step.toolCalls.map((call) => call.toolName),
        usage: step.usage,
      });
      await statReport("tokens", step.usage.totalTokens, {
        reportedBy: "interview project collect session",
        usage: step.usage,
      });
    },
    onError: ({ error }) => {
      projectLogger.error(`collect session streamText onError: ${(error as Error).message}`);
    },
    abortSignal,
  });

  // TODO: 需要在调用了 summary 工具以后，标记 completed

  // 持续 consume stream，不过因为加了 abortSignal，请求断了的时候 stream 也就直接断了，
  // TODO 要考虑下上面要不要加 abortSignal
  after(
    new Promise((resolve, reject) => {
      streamTextResult
        .consumeStream()
        .then(() => resolve(null))
        .catch((error) => reject(error));
    }),
  );

  return streamTextResult.toDataStreamResponse();
}
