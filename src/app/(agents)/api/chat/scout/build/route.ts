import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import { runBuildPersona } from "@/ai/tools/experts/buildPersona";
import { StatReporter } from "@/ai/tools/types";
import authOptions from "@/app/(auth)/authOptions";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
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
  // newMessage 没用到，这个接口不是聊天，只是在 scoutChat 已有消息的基础上调用 buildPersona 工具
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  const scoutLog = rootLogger.child({ scoutUserChatId: scoutUserChatId });
  const statReport: StatReporter = async (dimension, value, extra) => {
    console.log(
      `Mock StatReport, dimension: ${dimension}, value: ${value}, extra: ${JSON.stringify(extra)}`,
    );
  };

  const stream = createUIMessageStream({
    async execute({ writer }) {
      await runBuildPersona({
        scoutUserChatId,
        locale: await getLocale(),
        statReport,
        abortSignal: req.signal,
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
