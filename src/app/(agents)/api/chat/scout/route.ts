import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import authOptions from "@/app/(auth)/authOptions";
import { runScoutTaskChatStream } from "@/app/(study)/tools/scoutTaskChat";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { createUIMessageStream, createUIMessageStreamResponse, generateId } from "ai";
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

  const parseResult = clientMessagePayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    return NextResponse.json({ error }, { status: 400 });
  }
  const { message: newMessage, userChatToken } = parseResult.data;

  // 找到有效的 userChat，并确保有权限
  const userChat = await prisma.userChat.findUnique({
    where: { token: userChatToken, kind: "scout" },
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
  const scoutUserChatId = userChat.id;
  await persistentAIMessageToDB({
    mode: "append",
    userChatId: scoutUserChatId,
    message: {
      id: newMessage.id ?? generateId(),
      role: newMessage.role,
      parts: [newMessage.lastPart],
      metadata: newMessage.metadata,
    },
  });
  const scoutLog = rootLogger.child({ userChatId: scoutUserChatId });

  const stream = createUIMessageStream({
    async execute({ writer }) {
      await runScoutTaskChatStream({
        scoutUserChatId,
        locale: await getLocale(),
        abortSignal: req.signal,
        statReport: async () => {},
        logger: scoutLog,
        streamWriter: writer,
      });
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error);
      scoutLog.error(errorMsg);
      return errorMsg;
    },
  });

  return createUIMessageStreamResponse({ stream });
}
