import { fetchClarifyInterviewSession } from "@/app/interviewProject/actions";
import { authOptions } from "@/lib/auth";
import { llm, providerOptions } from "@/lib/llm";
import { rootLogger } from "@/lib/logging";
import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/lib/messageUtils";
import { interviewSessionSystem } from "@/prompt/interviewSession";
import {
  reasoningThinkingTool,
  saveInterviewSessionSummaryTool,
  StatReporter,
  ToolName,
  updateInterviewProjectTool,
} from "@/tools";
import { generateId, smoothStream, streamText } from "ai";
import { getServerSession } from "next-auth";
import { after, NextRequest, NextResponse } from "next/server";
import { ClarifySessionBodySchema } from "../lib";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Authenticate user
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // 用不到了，fetchClarifyInterviewSession会检查用户权限
  // const userId = session.user.id;

  const payload = await req.json();
  const parseResult = ClarifySessionBodySchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    return NextResponse.json({ error }, { status: 400 });
  }

  const { message: newMessage, sessionToken } = parseResult.data;
  // 这里会检查用户权限
  const result = await fetchClarifyInterviewSession(sessionToken);
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  const interviewSession = result.data;
  if (!interviewSession.userChatId) {
    rootLogger.error(`userChatId is null on clarify interview session ${sessionToken}`);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
  const userChatId = interviewSession.userChatId;

  // 无需再继续检查，可以直接安全的保存和读取 userChat.messages
  await persistentAIMessageToDB(userChatId, {
    ...newMessage,
    id: newMessage.id ?? generateId(),
  });
  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(userChatId);

  const abortSignal = req.signal;
  const statReport: StatReporter = async () => {};

  // Generate system message with project context
  const systemPrompt = interviewSessionSystem({
    projectTitle: interviewSession.project.title,
    projectBrief: interviewSession.project.brief,
    projectCategory: interviewSession.project.category,
    objectives: interviewSession.project.objectives,
    sessionKind: "clarify",
  });

  const streamTextResult = streamText({
    model: llm("gpt-4o"),
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
      [ToolName.updateInterviewProject]: updateInterviewProjectTool({
        projectId: interviewSession.projectId,
      }),
    },
    toolChoice: "auto",
    maxSteps: 5,
    temperature: 0.7,
    experimental_transform: smoothStream({
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),
    onStepFinish: async (step) => {
      appendStepToStreamingMessage(streamingMessage, step);
      if (streamingMessage.parts?.length && streamingMessage.content.trim()) {
        await persistentAIMessageToDB(userChatId, streamingMessage);
      }
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
