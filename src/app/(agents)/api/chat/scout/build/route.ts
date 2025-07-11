import { runBuildPersona } from "@/ai/tools/experts/buildPersona";
import { StatReporter } from "@/ai/tools/types";
import { authOptions } from "@/lib/auth";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { createDataStreamResponse } from "ai";
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
  if (!scoutUserChatId) {
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

  const scoutLog = rootLogger.child({ scoutUserChatId: scoutUserChatId });
  const statReport: StatReporter = async (dimension, value, extra) => {
    console.log(
      `Mock StatReport, dimension: ${dimension}, value: ${value}, extra: ${JSON.stringify(extra)}`,
    );
  };
  return createDataStreamResponse({
    execute: async (dataStream) => {
      await runBuildPersona({
        scoutUserChatId,
        locale: await getLocale(),
        statReport,
        abortSignal: req.signal,
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
