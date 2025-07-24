import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { llm, providerOptions } from "@/ai/provider";
import authOptions from "@/app/(auth)/authOptions";
import { fetchInterviewSessionByChatToken } from "@/app/(interviewProject)/actions";
import { generateInterviewPrompt } from "@/app/(interviewProject)/lib";
import { interviewSessionChatBodySchema } from "@/app/(interviewProject)/types";
import { rootLogger } from "@/lib/logging";
import { generateId, smoothStream, streamText } from "ai";
import { getServerSession } from "next-auth";
import { getLocale } from "next-intl/server";
import { after, NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const payload = await req.json();
  const parseResult = interviewSessionChatBodySchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    return NextResponse.json({ error }, { status: 400 });
  }

  const { message: newMessage, sessionToken } = parseResult.data;

  if (!sessionToken || !newMessage) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Get interview session details
  const sessionResult = await fetchInterviewSessionByChatToken(sessionToken);
  if (!sessionResult.success) {
    return NextResponse.json(
      { error: sessionResult.message },
      {
        status:
          sessionResult.code === "unauthorized"
            ? 401
            : sessionResult.code === "forbidden"
              ? 403
              : sessionResult.code === "not_found"
                ? 404
                : 500,
      },
    );
  }

  const interviewSession = sessionResult.data;
  const { project, userChat, intervieweePersona } = interviewSession;

  if (!userChat) {
    return NextResponse.json({ error: "No chat session found" }, { status: 400 });
  }

  // Check access permission
  const hasAccess =
    project.userId === session.user.id || // Project owner
    interviewSession.intervieweeUserId === session.user.id; // Interviewee

  if (!hasAccess) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const chatLogger = rootLogger.child({
    userChatId: userChat.id,
    userChatToken: userChat.token,
    interviewSessionId: interviewSession.id,
    intent: "InterviewSession",
  });

  // Save the latest user message to database
  await persistentAIMessageToDB(userChat.id, {
    ...newMessage,
    id: newMessage.id ?? generateId(),
  });

  const locale = await getLocale();
  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(userChat.id);

  // Generate system prompt based on interview context
  const isPersonaInterview = !!intervieweePersona;
  const systemPrompt = generateInterviewPrompt(
    project.brief,
    isPersonaInterview,
    intervieweePersona?.name,
  );

  const mergedAbortSignal = AbortSignal.any([req.signal]);

  const streamTextResult = streamText({
    model: llm("gemini-2.5-flash", {
      useSearchGrounding: false, // Disable search for interviews to keep focus
    }),
    providerOptions: {
      ...providerOptions,
    },
    system: systemPrompt,
    messages: coreMessages,
    tools: {
      // No tools needed for basic interview functionality
    },
    maxSteps: 1, // Keep it simple for interviews
    experimental_generateMessageId: () => streamingMessage.id,
    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),
    abortSignal: mergedAbortSignal,
    onStepFinish: async (step) => {
      appendStepToStreamingMessage(streamingMessage, step);
      if (streamingMessage.parts?.length && streamingMessage.content.trim()) {
        await persistentAIMessageToDB(userChat.id, streamingMessage);
      }
      chatLogger.info({
        msg: "interview session streamText onStepFinish",
        stepType: step.stepType,
        usage: step.usage,
        isPersonaInterview,
      });
    },
    onError: ({ error }) => {
      chatLogger.error(`interview session streamText onError: ${(error as Error).message}`);
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

  return streamTextResult.toDataStreamResponse();
}
