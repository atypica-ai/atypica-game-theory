import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import { initGenericUserChatStatReporter } from "@/ai/tools/stats";
import authOptions from "@/app/(auth)/authOptions";
import { executeUniversalAgent } from "@/app/(universal)/agent";
import { rootLogger } from "@/lib/logging";
import { detectInputLanguage } from "@/lib/textUtils";
import { prisma } from "@/prisma/prisma";
import { getUserTokens } from "@/tokens/lib";
import { createUIMessageStream, createUIMessageStreamResponse, generateId } from "ai";
import { getServerSession } from "next-auth/next";
import type { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // Parse request payload
  const payload = await req.json();
  const parseResult = clientMessagePayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    return NextResponse.json({ error }, { status: 400 });
  }
  const { message: newMessage, userChatToken } = parseResult.data;

  // Find and validate userChat
  const userChat = await prisma.userChat.findUnique({
    where: {
      token: userChatToken,
      userId,
      kind: {
        in: ["universal", "study"],
      },
    },
  });

  if (!userChat) {
    return NextResponse.json({ error: "UserChat not found" }, { status: 404 });
  }

  const universalChatId = userChat.id;
  const logger = rootLogger.child({
    userChatId: universalChatId,
    userChatToken: userChat.token,
  });

  // Initialize stat reporter
  const { statReport } = initGenericUserChatStatReporter({
    userId,
    userChatId: universalChatId,
    logger,
  });

  // Persist new message to database
  await persistentAIMessageToDB({
    mode: "append",
    userChatId: universalChatId,
    message: {
      id: newMessage.id ?? generateId(),
      role: newMessage.role,
      parts: [newMessage.lastPart],
      metadata: newMessage.metadata,
    },
  });

  // Detect input language
  const locale: Locale = await detectInputLanguage({
    text: newMessage.lastPart.type === "text" ? newMessage.lastPart.text : "",
    fallbackLocale: await getLocale(),
  });

  // Check token balance
  const { balance } = await getUserTokens({ userId });
  if (balance !== "Unlimited" && balance <= 0) {
    return NextResponse.json(
      { error: "Insufficient tokens. Please purchase more tokens to continue." },
      { status: 402 },
    );
  }

  const stream = createUIMessageStream({
    async execute({ writer }) {
      await executeUniversalAgent(
        {
          userId,
          userChat,
          statReport,
          logger,
          locale,
        },
        writer,
      );
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error({
        msg: "universal chat api onError",
        error: errorMsg,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return errorMsg;
    },
  });

  return createUIMessageStreamResponse({ stream });
}
