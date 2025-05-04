import { fetchClarifyInterviewSession } from "@/app/interviewProject/actions";
import { authOptions } from "@/lib/auth";
import { llm, providerOptions } from "@/lib/llm";
import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/lib/messageUtils";
import { prisma } from "@/lib/prisma";
import { interviewSessionSystem } from "@/prompt/interviewSession";
import {
  reasoningThinkingTool,
  saveInterviewSessionSummaryTool,
  StatReporter,
  ToolName,
} from "@/tools";
import { generateId, smoothStream, streamText } from "ai";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { ClarifySessionBodySchema } from "../lib";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Authenticate user
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const payload = await req.json();
  // Validate the request body
  const parseResult = ClarifySessionBodySchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    return NextResponse.json({ error }, { status: 400 });
  }

  const { message: newMessage, id: userChatId, sessionToken } = parseResult.data;
  // 这里会检查用户权限
  const result = await fetchClarifyInterviewSession(sessionToken);
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  const interviewSession = result.data;
  if (interviewSession.userChatId !== userChatId) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
  // 无需再继续检查，可以直接安全的读取 userChat
  const userChat = await prisma.userChat.findUniqueOrThrow({
    where: {
      id: userChatId,
      kind: "interviewSession",
    },
  });

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
    projectDescription: interviewSession.project.description,
    projectCategory: interviewSession.project.category,
    objectives: interviewSession.project.objectives,
    sessionKind: "clarify",
  });

  // Generate response from LLM
  const response = streamText({
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

  // Save assistant's response to database
  // if (response.messages.length > 0) {
  //   const lastMessage = response.messages[response.messages.length - 1];
  //   await saveChatMessage({
  //     userChatId: parseInt(id),
  //     message: lastMessage,
  //   });

  //   // Update session status if needed
  //   if (
  //     lastMessage.content.includes("interview is now complete") ||
  //     lastMessage.content.includes("Thank you for completing this interview")
  //   ) {
  //     await prisma.interviewSession.update({
  //       where: { id: interviewSession.id },
  //       data: { status: InterviewSessionStatus.completed },
  //     });
  //   }
  // }

  // Return streaming response
  return response.toDataStreamResponse();
}
