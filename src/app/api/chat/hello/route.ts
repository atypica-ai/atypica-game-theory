import { authOptions } from "@/lib/auth";
import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareNewMessageForStreaming,
} from "@/lib/messageUtils";
import openai from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { helloSystem } from "@/prompt/hello";
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

  const { coreMessages, streamingMessage } = await prepareNewMessageForStreaming(
    userChatId,
    newMessage,
  );

  const streamTextResult = streamText({
    model: openai("claude-3-7-sonnet"),
    providerOptions: {
      openai: { stream_options: { include_usage: true } },
    },
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
