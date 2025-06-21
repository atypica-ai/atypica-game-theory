import { persistentAIMessageToDB, prepareMessagesForStreaming } from "@/ai/messageUtils";
import { authOptions } from "@/lib/auth";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { CreateMessage, generateId, Message } from "ai";
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
  const newMessage = payload["message"] as Message | CreateMessage;
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

  // 首先要把新提交的消息保存
  // 如果是 user message，会新建一条，
  // 如果是 assistant message，一般是 addToolResult 的结果，这时候 messageId 已存在，则更新 tool 的交互结果
  await persistentAIMessageToDB(studyUserChatId, {
    ...newMessage,
    id: newMessage.id ?? generateId(),
  });
  const { coreMessages, streamingMessage, toolUseCount } =
    await prepareMessagesForStreaming(studyUserChatId);

  const reqSignal = req.signal;
  const params = {
    studyUserChatId,
    coreMessages,
    toolUseCount,
    streamingMessage,
    userId,
    reqSignal,
    studyLog,
  };
  const { permanentBalance, monthlyBalance } = await prisma.userTokens.findUniqueOrThrow({
    where: { userId: userId },
  });
  const balance = permanentBalance + monthlyBalance;
  if (balance <= 0) {
    return await noQuotaAgentRequest(params);
  } else {
    return await studyAgentRequest(params);
  }
}
