import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { helloSystem } from "@/ai/prompt";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { thanksTool } from "@/ai/tools/tools";
import { ToolName } from "@/ai/tools/types";
import authOptions from "@/app/(auth)/authOptions";
import { prisma } from "@/prisma/prisma";
import { UIMessage, smoothStream, stepCountIs, streamText } from "ai";
import { getServerSession } from "next-auth/next";
import { getLocale } from "next-intl/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const payload = await req.json();
  const userChatId = parseInt(payload["id"]);
  const newMessage = payload["message"] as UIMessage;
  if (!userChatId || !newMessage) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const userChat = await prisma.userChat.findUnique({
    where: { id: userChatId, kind: "misc" },
  });
  if (!userChat) {
    return NextResponse.json({ error: "UserChat not found" }, { status: 404 });
  }
  if (userChat.userId != userId) {
    return NextResponse.json(
      { error: "UserChat does not belong to the current user" },
      { status: 403 },
    );
  }

  const locale = await getLocale();
  await persistentAIMessageToDB(userChatId, newMessage);
  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(userChatId);

  const streamTextResult = streamText({
    model: llm("claude-3-7-sonnet"),
    providerOptions: defaultProviderOptions,
    system: helloSystem({ locale }),
    messages: coreMessages,

    tools: {
      [ToolName.thanks]: thanksTool,
    },

    stopWhen: stepCountIs(2),
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
    },

    abortSignal: req.signal,

    onError: ({ error }) => {
      console.log(error);
    },
  });

  return streamTextResult.toUIMessageStreamResponse();
}
