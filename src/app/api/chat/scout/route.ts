import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { runScoutTaskChatStream } from "@/ai/tools/experts/scoutTask";
import { authOptions } from "@/lib/auth";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { createDataStreamResponse, CreateMessage, generateId, Message } from "ai";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const payload = await req.json();
  const scoutUserChatId = parseInt(payload["id"]);
  const newMessage = payload["message"] as Message | CreateMessage;
  if (!scoutUserChatId || !newMessage) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // 找到有效的 userChat，并确保有权限
  const userChat = await prisma.userChat.findUnique({
    where: { id: scoutUserChatId, kind: "scout" },
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
  await persistentAIMessageToDB(scoutUserChatId, {
    ...newMessage,
    id: newMessage.id ?? generateId(),
  });
  const scoutLog = rootLogger.child({ scoutUserChatId: scoutUserChatId });
  return createDataStreamResponse({
    execute: async (dataStream) => {
      await runScoutTaskChatStream({
        scoutUserChatId,
        abortSignal: req.signal,
        statReport: async () => {},
        scoutLog,
        streamWriter: dataStream,
      });
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error);
      scoutLog.error(errorMsg);
      return errorMsg;
    },
  });
}
