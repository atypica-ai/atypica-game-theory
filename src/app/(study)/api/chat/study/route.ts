import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import authOptions from "@/app/(auth)/authOptions";
import { VALID_LOCALES } from "@/i18n/routing";
import { rootLogger } from "@/lib/logging";
import { detectInputLanguage } from "@/lib/textUtils";
import { UserChatExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { AnalystKind } from "@/prisma/types";
import { getUserTokens } from "@/tokens/lib";
import { generateId } from "ai";
import { getServerSession } from "next-auth/next";
import { Locale } from "next-intl";
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

  const briefStatus: "CLARIFIED" | "DRAFT" = (userChat.extra as UserChatExtra)?.briefUserChatId
    ? "CLARIFIED"
    : "DRAFT";

  // 首先遵循用户的输入语言，然后，如果 analyst 语言已经定了，默认使用 analyst 的语言
  const locale: Locale = await detectInputLanguage({
    text: newMessage.parts // 所有 text parts 的文本合在一起检测
      .map((part) => (part.type === "text" ? part.text : ""))
      .join(""),
    fallbackLocale:
      userChat.analyst.locale && VALID_LOCALES.includes(userChat.analyst.locale as Locale)
        ? (userChat.analyst.locale as Locale)
        : undefined,
  });

  const reqSignal = req.signal;

  const params = {
    locale,
    briefStatus,
    studyUserChatId,
    userId,
    reqSignal,
    studyLog,
  };
  const { balance } = await getUserTokens({ userId });
  if (balance <= 0) {
    return await noQuotaAgentRequest(params);
  } else if (userChat.analyst.kind === AnalystKind.productRnD) {
    return await productRnDAgentRequest(params);
  } else {
    return await studyAgentRequest(params);
  }
}
