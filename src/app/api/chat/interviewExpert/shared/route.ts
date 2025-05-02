import { llm, providerOptions } from "@/lib/llm";
import { convertDBMessageToAIMessage } from "@/lib/messageUtils";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";
import { interviewExpertPrompt } from "@/prompt/interviewExpert";
import { ToolName } from "@/tools";
import { reasoningThinkingTool } from "@/tools/experts/reasoning";
import { saveInterviewSummaryTool } from "@/tools/interviewExpert";
import { Message, streamText } from "ai";
import { NextRequest } from "next/server";
import { z } from "zod";
import { saveChatMessage } from "../lib";

export const maxDuration = 60;

// Schema for shared interview API request body
const SharedInterviewBodySchema = z.object({
  message: z.object({
    id: z.string(),
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
    parts: z.array(z.any()).optional(),
  }),
  id: z.number().optional(), // User chat ID (may be null for first message)
  sessionId: z.number(),
  sessionToken: z.string(),
});

export async function POST(req: NextRequest) {
  // Parse the request body
  let body;
  try {
    body = await req.json();
  } catch (error) {
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
  const parseResult = SharedInterviewBodySchema.safeParse(body);
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
      type: "shareable",
    },
    include: {
      project: {
        select: {
          title: true,
          description: true,
          type: true,
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

  // First message in a shared interview session? Create UserChat
  if (!chatId) {
    // Create a new UserChat for this anonymous user
    const userChat = await prisma.userChat.create({
      data: {
        userId: interviewSession.project.userId, // Owned by the project creator
        title: `Shared: ${interviewSession.title}`,
        kind: "interviewExpert",
        token: generateToken(),
      },
    });
    userChatId = userChat.id;
    // Update the session with this UserChat
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        userChatId: userChatId,
        status: "active",
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
  const systemMessage = interviewExpertPrompt({
    projectTitle: interviewSession.project.title,
    projectDescription: interviewSession.project.description,
    projectType: interviewSession.project.type,
    objectives: interviewSession.project.objectives,
    sessionId: interviewSession.id,
  });

  // Generate response from LLM
  const response = streamText({
    model: llm("gpt-4o"),
    messages: [{ role: "system", content: systemMessage }, ...messages],
    tools: {
      [ToolName.reasoningThinking]: reasoningThinkingTool({
        abortSignal: abortController.signal,
        statReport: async () => {}, // No reporting for shared interviews
      }),
      [ToolName.saveInterviewSummary]: saveInterviewSummaryTool({
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
  //       data: { status: "completed" },
  //     });
  //   }
  // }

  // Return streaming response
  return response.toDataStreamResponse();
}
