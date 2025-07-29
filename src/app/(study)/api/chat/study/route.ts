import { persistentAIMessageToDB, prepareMessagesForStreaming } from "@/ai/messageUtils";
import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import authOptions from "@/app/(auth)/authOptions";
import { rootLogger } from "@/lib/logging";
import { UserChatExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { AnalystKind } from "@/prisma/types";
import { generateId } from "ai";
import { getServerSession } from "next-auth/next";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { NextResponse } from "next/server";
import { noQuotaAgentRequest } from "./noQuotaAgentRequest";
import { productRnDAgentRequest } from "./productRnDAgentRequest";
import { studyAgentRequest } from "./studyAgentRequest";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // const payload = await req.json();
  // const studyUserChatId = parseInt(payload["id"]);
  // const newMessage = payload["message"] as Message | CreateMessage;
  // if (!studyUserChatId || !newMessage) {
  //   return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  // }

  const payload = await req.json();
  const parseResult = clientMessagePayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    return NextResponse.json({ error }, { status: 400 });
  }
  const { message: newMessage, userChatToken } = parseResult.data;

  // 找到有效的 userChat，并确保有权限
  const userChat = await prisma.userChat.findUnique({
    where: {
      token: userChatToken,
      kind: "study",
    },
    include: {
      analyst: true,
    },
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
  const studyUserChatId = userChat.id;

  const studyLog = rootLogger.child({ studyUserChatId, studyUserChatToken: userChat.token });
  if (!userChat.analyst) {
    const msg = `UserChat ${userChat.id} does not have an analyst`;
    studyLog.error(msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // 首先要把新提交的消息保存
  // 如果是 user message，会新建一条，
  // 如果是 assistant message，一般是 addToolResult 的结果，这时候 messageId 已存在，则更新 tool 的交互结果
  await persistentAIMessageToDB(studyUserChatId, {
    ...newMessage,
    id: newMessage.id ?? generateId(),
  });
  const { coreMessages, streamingMessage, toolUseCount } =
    await prepareMessagesForStreaming(studyUserChatId);

  const briefStatus: "CLARIFIED" | "DRAFT" = (userChat.extra as UserChatExtra)?.briefUserChatId
    ? "CLARIFIED"
    : "DRAFT";

  // 如果 analyst 语言已经定了，后面始终使用这个语言
  const locale: Locale =
    userChat.analyst.locale === "zh-CN"
      ? "zh-CN"
      : userChat.analyst.locale === "en-US"
        ? "en-US"
        : await getLocale();

  const reqSignal = req.signal;

  const params = {
    locale,
    briefStatus,
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
  } else if (userChat.analyst.kind === AnalystKind.productRnD) {
    return await productRnDAgentRequest(params);
  } else {
    return await studyAgentRequest(params);
  }
}
