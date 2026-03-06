import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { webFetchTool } from "@/ai/tools/tools";
import authOptions from "@/app/(auth)/authOptions";
import { contextBuilderSystem } from "@/app/(memory)/prompt/memoryBuilder/team";
import { endInterviewTool } from "@/app/(memory)/tools/endInterview";
import { rootLogger } from "@/lib/logging";
import { detectInputLanguage } from "@/lib/textUtils";
import { correctUserInputMessage } from "@/lib/userChat/lib";
import { prisma } from "@/prisma/prisma";
import { generateId, smoothStream, stepCountIs, streamText } from "ai";
import { getServerSession } from "next-auth/next";
import { getLocale } from "next-intl/server";
import { after, NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.userType !== "TeamMember" || !session.team) {
    return NextResponse.json({ error: "Only team owners can use this feature" }, { status: 403 });
  }
  const [team, user] = await Promise.all([
    prisma.team.findUnique({ where: { id: session.team.id }, select: { ownerUserId: true } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { personalUserId: true } }),
  ]);
  if (!team || !user || team.ownerUserId !== user.personalUserId) {
    return NextResponse.json({ error: "Only team owners can use this feature" }, { status: 403 });
  }

  const userId = session.user.id;
  const teamId = session.team.id;
  const payload = await req.json();

  const parseResult = clientMessagePayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    return NextResponse.json({ error }, { status: 400 });
  }
  const { message: newMessage, userChatToken } = parseResult.data;

  // 动态检测用户输入的语言
  const locale = await detectInputLanguage({
    text: newMessage.lastPart.type === "text" ? newMessage.lastPart.text : "",
    fallbackLocale: await getLocale(),
  });

  const userChat = await prisma.userChat.findUnique({
    where: { token: userChatToken, kind: "misc" },
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

  const userChatId = userChat.id;

  await persistentAIMessageToDB({
    mode: "append",
    userChatId,
    message: {
      id: newMessage.id ?? generateId(),
      role: newMessage.role,
      parts: [newMessage.lastPart],
      metadata: newMessage.metadata,
    },
  });

  const chatLogger = rootLogger.child({
    userChatId,
    userChatToken: userChat.token,
    kind: "misc",
  });

  const tools = {
    // google_search: google.tools.googleSearch({
    //   mode: "MODE_DYNAMIC",
    //   // Use a low but non-zero threshold so Gemini almost always searches
    //   dynamicThreshold: 0.1,
    // }),
    webFetch: webFetchTool({ locale }),
    ...endInterviewTool({ locale, teamId }),
  };

  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(userChatId, {
    tools,
  });

  // 如果需要语音优化，立即启动（不等待）
  if (newMessage.metadata?.shouldCorrectUserMessage && newMessage.id) {
    // 不使用 await - 让优化与 streamText 并行执行
    after(
      correctUserInputMessage({
        userChatId,
        messageId: newMessage.id,
        contextMessages: coreMessages.slice(-3, -1), // 前面的 2 条消息作为上下文（排除最后一条，即当前消息）
        locale,
      }).catch((error) => {
        chatLogger.error({
          msg: "Voice message optimization failed",
          error: error.message,
        });
      }),
    );
  }

  const streamTextResult = streamText({
    // model: llm("gemini-3-flash"),
    model: llm("claude-haiku-4-5"),
    providerOptions: defaultProviderOptions(),
    system: contextBuilderSystem({ locale }),
    messages: coreMessages,

    tools,

    stopWhen: stepCountIs(2),

    experimental_transform: [
      smoothStream({
        delayInMs: 30,
        chunking: /[\u4E00-\u9FFF]|\S+\s+/,
      }),
      () =>
        new TransformStream({
          transform(chunk, controller) {
            if (chunk.type === "text-delta") {
              controller.enqueue({ ...chunk, text: chunk.text.replace(/\*/g, "") });
            } else {
              controller.enqueue(chunk);
            }
          },
        }),
    ],

    onStepFinish: async (step) => {
      appendStepToStreamingMessage(streamingMessage, step);
      if (streamingMessage.parts?.length) {
        await persistentAIMessageToDB({
          mode: "override",
          userChatId,
          message: streamingMessage,
        });
      }
    },

    abortSignal: req.signal,

    onError: ({ error }) => {
      chatLogger.error({
        msg: "Context builder chat error",
        error: error instanceof Error ? error.message : String(error),
      });
    },
  });

  return streamTextResult.toUIMessageStreamResponse({
    generateMessageId: () => streamingMessage.id,
  });
}
