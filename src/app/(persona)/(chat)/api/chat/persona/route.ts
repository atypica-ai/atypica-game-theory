import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { initGenericUserChatStatReporter } from "@/ai/tools/stats";
import { calculateStepTokensUsage } from "@/ai/usage";
import authOptions from "@/app/(auth)/authOptions";
import { fetchUserPersonaChatByToken } from "@/app/(persona)/actions";
import { personaAgentSystem } from "@/app/(persona)/prompt/personaAgent";
import { VALID_LOCALES } from "@/i18n/routing";
import { rootLogger } from "@/lib/logging";
import { detectInputLanguage } from "@/lib/textUtils";
import { google } from "@ai-sdk/google";
import { generateId, smoothStream, stepCountIs, streamText } from "ai";
import { getServerSession } from "next-auth";
import { Locale } from "next-intl";
import { after, NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const payload = await req.json();
  const parseResult = clientMessagePayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    return NextResponse.json({ error }, { status: 400 });
  }

  const {
    // id, // 没用到
    message: newMessage,
    userChatToken,
    attachments: newAttachments,
  } = parseResult.data;

  if (!userChatToken || !newMessage) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Check access permission and get persona
  const accessResult = await fetchUserPersonaChatByToken(userChatToken);
  if (!accessResult.success) {
    return NextResponse.json(
      { error: accessResult.message },
      {
        status:
          accessResult.code === "unauthorized"
            ? 401
            : accessResult.code === "forbidden"
              ? 404
              : accessResult.code === "not_found"
                ? 404
                : 500,
      },
    );
  }
  const { userChat, persona } = accessResult.data;

  const chatLogger = rootLogger.child({
    userChatId: userChat.id,
    userChatToken: userChat.token,
    intent: "UserPersonaChat",
  });

  // 和 persona 聊天消耗聊天人的额度，类型是 generic 不是 personaImport
  const { statReport } = initGenericUserChatStatReporter({
    userId: session.user.id,
    userChatId: userChat.id,
    logger: chatLogger,
  });

  // Save the latest user message to database
  await persistentAIMessageToDB({
    mode: "append",
    userChatId: userChat.id,
    message: {
      id: newMessage.id ?? generateId(),
      role: newMessage.role,
      parts: [newMessage.lastPart],
      metadata: newMessage.metadata,
    },
    attachments: newAttachments,
  });

  // 动态检测用户输入的语言，先检测用户输入的语言，默认使用 persona 自身的语言
  const locale = await detectInputLanguage({
    text: newMessage.lastPart.type === "text" ? newMessage.lastPart.text : "",
    fallbackLocale:
      persona.locale && VALID_LOCALES.includes(persona.locale as Locale)
        ? (persona.locale as Locale)
        : undefined,
  });

  const tools = {
    google_search: google.tools.googleSearch({
      mode: "MODE_DYNAMIC",
      dynamicThreshold: 0.3, // threshold 越小，使用搜索的可能性就越高
    }),
    // [BasicToolName.dySearch]: dySearchTool,
    // [BasicToolName.insSearch]: insSearchTool,
    // [BasicToolName.tiktokSearch]: tiktokSearchTool,
    // [BasicToolName.xhsSearch]: xhsSearchTool,  // 太贵了，先不用
    // [BasicToolName.reasoningThinking]: reasoningThinkingTool(),
  };
  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(userChat.id, {
    tools,
  });

  const mergedAbortSignal = AbortSignal.any([
    req.signal,
    // AbortSignal.timeout(1), // test purpose
  ]);
  // mergedAbortSignal.addEventListener("abort", (ev) => {
  //   console.log(`aborted`, ev);
  // });

  const streamTextResult = streamText({
    // model: llm("claude-3-7-sonnet"),
    // model: llm("gpt-4.1-mini"),
    model: llm("gemini-2.5-flash"),
    providerOptions: defaultProviderOptions,

    system: personaAgentSystem({ persona, locale }),
    messages: coreMessages,

    tools,

    stopWhen: stepCountIs(2),

    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),

    abortSignal: mergedAbortSignal,

    onStepFinish: async (step) => {
      appendStepToStreamingMessage(streamingMessage, step);
      if (
        streamingMessage.parts?.length
        // 🤔 这个判断不一定需要，只要 parts 长度不是 0 就可以保存
        // && streamingMessage.parts // 所有 text parts 的文本合在一起检测
        //   .map((part) => (part.type === "text" ? part.text : "")).join("").trim()
      ) {
        await persistentAIMessageToDB({
          mode: "override",
          userChatId: userChat.id,
          message: streamingMessage,
        });
      }
      const { tokens, extra } = calculateStepTokensUsage(step);
      chatLogger.info({
        msg: "persona user chat streamText onStepFinish",
        usage: extra.usage,
        cache: extra.cache,
      });
      if (statReport) {
        await statReport("tokens", tokens, {
          reportedBy: "persona user chat",
          ...extra,
        });
      }
    },

    // onFinish: async () => {
    //   console.log("persona chat streamTextResult onFinish");
    // },
    onError: ({ error }) => {
      chatLogger.error(`persona user chat streamText onError: ${(error as Error).message}`);
    },
  });

  after(
    new Promise((resolve, reject) => {
      streamTextResult
        .consumeStream()
        .then(() => {
          // abortSignal 发生了以后，会进 then，不过 consumeStream 的 then 是没有 resolve 的内容的
          // console.log("persona chat streamTextResult.consumeStream() resolved");
          resolve(null);
        })
        .catch((error) => {
          reject(error);
        });
    }),
  );

  return streamTextResult.toUIMessageStreamResponse({
    generateMessageId: () => streamingMessage.id,
  });
}
