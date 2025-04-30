import { authOptions } from "@/lib/auth";
import { llm, providerOptions } from "@/lib/llm";
import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/lib/messageUtils";
import { prisma } from "@/lib/prisma";
import { helloSystem } from "@/prompt";
import { thanksTool, ToolName } from "@/tools";
import { Message, streamText } from "ai";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const payload = await req.json();
  const userChatId = parseInt(payload["id"]);
  const newMessage = payload["message"] as Message;
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

  await persistentAIMessageToDB(userChatId, newMessage);
  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(userChatId);

  const streamTextResult = streamText({
    model: llm("claude-3-7-sonnet"),
    providerOptions: providerOptions,
    system: helloSystem(),
    messages: coreMessages,
    tools: {
      [ToolName.thanks]: thanksTool,
    },
    maxSteps: 2,
    onStepFinish: async (step) => {
      appendStepToStreamingMessage(streamingMessage, step);
      if (streamingMessage.parts?.length && streamingMessage.content.trim()) {
        await persistentAIMessageToDB(userChatId, streamingMessage);
      }
    },
    abortSignal: req.signal,
    onError: (error) => {
      console.log(error);
    },
  });

  return streamTextResult.toDataStreamResponse();
}
