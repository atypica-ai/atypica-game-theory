import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { llm, providerOptions } from "@/ai/provider";
import { authOptions } from "@/lib/auth";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { generateId, smoothStream, streamText } from "ai";
import { getServerSession } from "next-auth";
import { getLocale } from "next-intl/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { newStudySystem } from "../../../prompt";
import { newStudyTools } from "../../../tools";

const NewStudyBodySchema = z.object({
  message: z.object({
    id: z.string().optional(),
    role: z.enum(["user", "assistant", "system", "data"]),
    content: z.string(),
  }),
  userChatId: z.number(),
});

export async function POST(req: NextRequest) {
  const locale = await getLocale();

  // Authenticate user
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const payload = await req.json();
  const parseResult = NewStudyBodySchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    return NextResponse.json({ error }, { status: 400 });
  }

  const { message: newMessage, userChatId } = parseResult.data;

  // Verify user has access to this chat
  const userChat = await prisma.userChat.findUnique({
    where: {
      id: userChatId,
      userId,
      kind: "misc",
    },
  });

  if (!userChat) {
    return NextResponse.json({ error: "Chat not found or access denied" }, { status: 404 });
  }

  // Persist the new message
  await persistentAIMessageToDB(userChatId, {
    ...newMessage,
    id: newMessage.id ?? generateId(),
  });

  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(userChatId);

  const abortSignal = req.signal;
  const chatLogger = rootLogger.child({
    userChatId,
    userChatToken: userChat.token,
    kind: "misc",
  });

  const streamTextResult = streamText({
    model: llm("claude-3-7-sonnet"),
    providerOptions,
    system: newStudySystem({ locale }),
    messages: coreMessages,
    tools: newStudyTools,
    maxSteps: 1,
    temperature: 0.5,
    experimental_generateMessageId: () => streamingMessage.id,
    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),
    onStepFinish: async (step) => {
      appendStepToStreamingMessage(streamingMessage, step);
      // Persist the assistant's message parts as they are generated.
      if (streamingMessage.parts?.length && streamingMessage.content.trim()) {
        await persistentAIMessageToDB(userChatId, streamingMessage);
      }
      chatLogger.info({
        msg: "new study planning streamText onStepFinish",
        stepType: step.stepType,
        toolCalls: step.toolCalls.map((call) => call.toolName),
        usage: step.usage,
      });
    },
    onError: ({ error }) => {
      chatLogger.error(`new study planning streamText onError: ${(error as Error).message}`);
    },
    abortSignal,
  });

  return streamTextResult.toDataStreamResponse();
}
