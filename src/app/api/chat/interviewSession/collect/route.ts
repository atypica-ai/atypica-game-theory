import { fetchCollectInterviewSession } from "@/app/interviewProject/actions";
import { llm, providerOptions } from "@/lib/llm";
import { rootLogger } from "@/lib/logging";
import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/lib/messageUtils";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";
import { interviewSessionSystem } from "@/prompt/interviewSession";
import { saveInterviewSessionSummaryTool, StatReporter, ToolName } from "@/tools";
import { reasoningThinkingTool } from "@/tools/experts/reasoning";
import { generateId, smoothStream, streamText } from "ai";
import { after, NextRequest, NextResponse } from "next/server";
import { CollectSessionBodySchema } from "../lib";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const parseResult = CollectSessionBodySchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    return NextResponse.json({ error }, { status: 400 });
  }

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

  let userChatId: number;

  // First message in a collect session? Create UserChat
  if (!interviewSession.userChatId) {
    const userChat = await prisma.$transaction(async (tx) => {
      const project = await tx.interviewProject.findUniqueOrThrow({
        where: { id: interviewSession.projectId },
      });
      const userChat = await tx.userChat.create({
        data: {
          userId: project.userId, // Owned by the project creator
          title: `Shared: ${interviewSession.title}`,
          kind: "interviewSession",
          token: generateToken(),
        },
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
  const statReport: StatReporter = async () => {};
  const projectLogger = rootLogger.child({
    interviewProjectId: interviewSession.projectId,
    sessionChatId: interviewSession.userChatId,
    sessionToken: interviewSession.token,
    sessionKind: interviewSession.kind,
  });

  // Generate system message with project context
  const systemPrompt = interviewSessionSystem({
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
        abortSignal,
        statReport,
      }),
      [ToolName.saveInterviewSessionSummary]: saveInterviewSessionSummaryTool({
        sessionId: interviewSession.id,
      }),
    },
    toolChoice: "auto",
    maxSteps: 5,
    temperature: 0.7,
    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),
    onStepFinish: async (step) => {
      projectLogger.info({
        msg: "collect session streamText onStepFinish",
        stepType: step.stepType,
        toolCalls: step.toolCalls.map((call) => call.toolName),
        usage: step.usage,
      });
      appendStepToStreamingMessage(streamingMessage, step);
      if (streamingMessage.parts?.length && streamingMessage.content.trim()) {
        await persistentAIMessageToDB(userChatId, streamingMessage);
      }
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
