import { llm, providerOptions } from "@/lib/llm";
import { convertDBMessageToAIMessage } from "@/lib/messageUtils";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";
import { interviewSessionSystem } from "@/prompt/interviewSession";
import { saveInterviewSessionSummaryTool, ToolName } from "@/tools";
import { reasoningThinkingTool } from "@/tools/experts/reasoning";
import { InterviewSessionStatus, UserChatKind } from "@prisma/client";
import { Message, streamText } from "ai";
import { NextRequest } from "next/server";
import { CollectSessionBodySchema, saveChatMessage } from "../lib";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
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
  const parseResult = CollectSessionBodySchema.safeParse(body);
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
  const { message, id: chatId, sessionId, sessionToken } = parseResult.data;

  // Verify the session token is valid
  const interviewSession = await prisma.interviewSession.findUnique({
    where: {
      id: sessionId,
      token: sessionToken,
      kind: "collect",
    },
    include: {
      project: {
        select: {
          title: true,
          description: true,
          category: true,
          objectives: true,
          userId: true,
        },
      },
    },
  });

  if (!interviewSession) {
    return Response.json(
      {
        error: {
          code: "not_found",
          message: "The specified interview session was not found.",
        },
      },
      { status: 404 },
    );
  }

  // Check if session is expired
  if (interviewSession.expiresAt && new Date() > new Date(interviewSession.expiresAt)) {
    return Response.json(
      {
        error: {
          code: "expired",
          message: "This interview has expired.",
        },
      },
      { status: 403 },
    );
  }

  let userChatId: number;
  let messages: Message[] = [];

  // First message in a collect session? Create UserChat
  if (!chatId) {
    // Create a new UserChat for this anonymous user
    const userChat = await prisma.userChat.create({
      data: {
        userId: interviewSession.project.userId, // Owned by the project creator
        title: `Shared: ${interviewSession.title}`,
        kind: UserChatKind.interviewSession,
        token: generateToken(),
      },
    });
    userChatId = userChat.id;
    // Update the session with this UserChat
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        userChatId: userChatId,
        status: InterviewSessionStatus.active,
      },
    });
  } else {
    if (interviewSession.userChatId !== chatId) {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_chat_id",
            message: "Invalid chat ID",
          },
        }),
        { status: 400 },
      );
    }
    userChatId = chatId;
    // Get previous messages for context
    const dbMessages = await prisma.chatMessage.findMany({
      where: {
        userChatId,
      },
      orderBy: {
        id: "asc",
      },
    });
    messages = dbMessages.map(convertDBMessageToAIMessage);
  }

  // Save the user's message to the database
  await saveChatMessage({
    userChatId,
    message,
  });

  // Add the newest message to our context
  messages.push(message);

  // Create abort controller for the request
  const abortController = new AbortController();
  req.signal.addEventListener("abort", () => {
    abortController.abort();
  });

  // Generate system message with project context
  const systemPrompt = interviewSessionSystem({
    projectTitle: interviewSession.project.title,
    projectDescription: interviewSession.project.description,
    projectCategory: interviewSession.project.category,
    objectives: interviewSession.project.objectives,
    sessionKind: "collect",
  });

  // Generate response from LLM
  const response = streamText({
    model: llm("gpt-4o"),
    system: systemPrompt,
    messages: messages,
    tools: {
      [ToolName.reasoningThinking]: reasoningThinkingTool({
        abortSignal: abortController.signal,
        statReport: async () => {}, // No reporting for collect sessions
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
  });

  // Save assistant's response to database
  // if (response.messages.length > 0) {
  //   const lastMessage = response.messages[response.messages.length - 1];
  //   await saveChatMessage({
  //     userChatId,
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
