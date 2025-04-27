import { authOptions } from "@/lib/auth";
import { rootLogger } from "@/lib/logging";
import { prepareNewMessageForStreaming } from "@/lib/messageUtils";
import { prisma } from "@/lib/prisma";
import { Message } from "ai";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { noQuotaAgentRequest } from "./noQuotaAgentRequest";
import { studyAgentRequest } from "./studyAgentRequest";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const payload = await req.json();
  const studyUserChatId = parseInt(payload["id"]);
  const newMessage = payload["message"] as Message;
  if (!studyUserChatId || !newMessage) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // 找到有效的 userChat，并确保有权限
  const userChat = await prisma.userChat.findUnique({
    where: { id: studyUserChatId, kind: "study" },
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

  const studyLog = rootLogger.child({ studyUserChatId, studyUserChatToken: userChat.token });

  const { coreMessages, streamingMessage, toolUseCount, tokensConsumed } =
    await prepareNewMessageForStreaming(studyUserChatId, newMessage);

  const reqSignal = req.signal;
  const params = {
    studyUserChatId,
    coreMessages,
    toolUseCount,
    tokensConsumed,
    streamingMessage,
    userId,
    reqSignal,
    studyLog,
  };
  // const hasQuota = await checkQuota({ studyUserChatId, userId, cost: 500_000 });
  const { balance } = await prisma.userTokens.findUniqueOrThrow({
    where: { userId: userId },
  });
  if (balance <= 0) {
    return await noQuotaAgentRequest(params);
  } else {
    return await studyAgentRequest(params);
  }
}
