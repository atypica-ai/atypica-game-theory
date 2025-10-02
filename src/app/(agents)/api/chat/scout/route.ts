import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { runScoutTaskChatStream } from "@/ai/tools/experts/scoutTaskChat";
import authOptions from "@/app/(auth)/authOptions";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { CreateUIMessage, createUIMessageStreamResponse, generateId, UIMessage } from "ai";
import { getServerSession } from "next-auth";
import { getLocale } from "next-intl/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const payload = await req.json();
  const scoutUserChatId = parseInt(payload["id"]);
  const newMessage = payload["message"] as UIMessage | CreateUIMessage;
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
  return createUIMessageStreamResponse({
    execute: async (dataStream) => {
      await runScoutTaskChatStream({
        scoutUserChatId,
        locale: await getLocale(),
        abortSignal: req.signal,
        statReport: async () => {},
        logger: scoutLog,
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
