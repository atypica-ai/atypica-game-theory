import { authOptions } from "@/lib/auth";
import { llm, providerOptions } from "@/lib/llm";
import { prisma } from "@/lib/prisma";
import { interviewSessionSystem } from "@/prompt/interviewSession";
import {
  reasoningThinkingTool,
  saveInterviewSessionSummaryTool,
  StatReporter,
  ToolName,
} from "@/tools";
import { Message, streamText } from "ai";
import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { ClarifySessionBodySchema, saveChatMessage } from "../lib";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Authenticate user
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json(
      {
        error: {
          code: "unauthorized",
          message: "You must be signed in to use this API.",
        },
      },
      { status: 401 },
    );
  }
  const userId = session.user.id;

  // Parse the request body
  let body;
  try {
    body = await req.json();
  } catch (error) {
    console.log(error);
    return Response.json(
      {
        error: {
          code: "bad_request",
          message: "The request body is not valid JSON.",
        },
      },
      { status: 400 },
    );
  }

  // Validate the request body
  const parseResult = ClarifySessionBodySchema.safeParse(body);
  if (!parseResult.success) {
    return Response.json(
      {
        error: {
          code: "bad_request",
          message: "The request body does not match the expected schema.",
          details: parseResult.error.format(),
        },
      },
      { status: 400 },
    );
  }

  // Extract data from request
  const { message, id: chatId, projectId, sessionId } = parseResult.data;

  // Verify the user has access to this chat
  const userChat = await prisma.userChat.findUnique({
    where: {
      id: chatId,
      userId,
      kind: "interviewSession",
    },
  });

  if (!userChat) {
    return Response.json(
      {
        error: {
          code: "not_found",
          message: "The specified chat was not found or you do not have access to it.",
        },
      },
      { status: 404 },
    );
  }

  // Save the user's message to the database
  await saveChatMessage({
    userChatId: chatId,
    message: message,
  });

  // Verify the session belongs to this user
  const interviewSession = await prisma.interviewSession.findUnique({
    where: {
      id: sessionId,
      projectId: projectId,
      userChatId: chatId,
    },
    include: {
      project: {
        select: {
          userId: true,
          title: true,
          description: true,
          category: true,
          objectives: true,
        },
      },
    },
  });

  if (!interviewSession || interviewSession.project.userId !== userId) {
    return Response.json(
      {
        error: {
          code: "forbidden",
          message: "You do not have access to this interview session.",
        },
      },
      { status: 403 },
    );
  }

  // Get previous messages for context
  const dbMessages = await prisma.chatMessage.findMany({
    where: {
      userChatId: chatId,
    },
    orderBy: {
      id: "asc",
    },
  });

  const messages: Message[] = dbMessages.map((dbMessage) => ({
    id: dbMessage.messageId,
    role: dbMessage.role as "user" | "assistant" | "system",
    content: dbMessage.content,
  }));

  // Create abort controller for the request
  const abortController = new AbortController();
  req.signal.addEventListener("abort", () => {
    abortController.abort();
  });

  // Set up stats reporting, do nothing for the moment
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
    system: systemPrompt,
    messages: messages,
    tools: {
      [ToolName.reasoningThinking]: reasoningThinkingTool({
        abortSignal: abortController.signal,
        statReport,
      }),
      [ToolName.saveInterviewSessionSummary]: saveInterviewSessionSummaryTool({
        sessionId: interviewSession.id,
      }),
    },
    toolChoice: "auto",
    maxSteps: 5,
    temperature: 0.7,
    providerOptions,
    abortSignal: abortController.signal,
    // onStepFinish: async (step) => {
    //   if (step.usage?.totalTokens) {
    //     await statReport("tokens", step.usage.totalTokens, {
    //       // TODO
    //     });
    //   }
    // },
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
