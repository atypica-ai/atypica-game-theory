import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { initPersonaImportStatReporter } from "@/ai/tools/stats";
import { reasoningThinkingTool } from "@/ai/tools/tools";
import { BasicToolName } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import { personaFollowUpSystemPrompt } from "@/app/(persona)/prompt";
import { followUpInterviewTools } from "@/app/(persona)/tools";
import { PersonaImportAnalysis } from "@/app/(persona)/types";
import { rootLogger } from "@/lib/logging";
import { detectInputLanguage } from "@/lib/textUtils";
import { correctUserInputMessage } from "@/lib/userChat/lib";
import { prisma } from "@/prisma/prisma";
import { generateId, smoothStream, stepCountIs, streamText } from "ai";
import { after, NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const parseResult = clientMessagePayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    return NextResponse.json({ error }, { status: 400 });
  }
  const { message: newMessage, userChatToken } = parseResult.data;

  // Verify the UserChat exists and is of the correct type
  const userChat = await prisma.userChat.findUnique({
    where: {
      token: userChatToken,
      kind: "interviewSession",
      personaImport: {
        isNot: null,
      },
    },
    include: {
      user: true,
      personaImport: true, // related to extraUserChatId on personaImport
    },
  });

  if (!userChat) {
    return NextResponse.json({ error: "Follow-up interview not found" }, { status: 404 });
  }

  const chatLogger = rootLogger.child({
    userChatId: userChat.id,
    userChatToken: userChat.token,
    intent: "PersonaFollowUpInterview",
  });

  if (!userChat.personaImport) {
    chatLogger.error(`PersonaImport not found for follow-up interview chat ${userChat.id}`);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  const { statReport } = initPersonaImportStatReporter({
    userId: userChat.user.id,
    personaImportId: userChat.personaImport.id,
    userChatId: userChat.id,
    logger: chatLogger,
  });

  // Save the user message
  await persistentAIMessageToDB({
    userChatId: userChat.id,
    message: {
      ...newMessage,
      id: newMessage.id ?? generateId(),
    },
  });

  const abortSignal = req.signal;

  const { personaImport } = userChat;

  // 动态检测用户输入的语言，先检测用户输入的语言，默认使用用户导入的访谈文件的语言 (context 内容)
  const locale = await detectInputLanguage({
    text: newMessage.parts // 所有 text parts 的文本合在一起检测
      .map((part) => (part.type === "text" ? part.text : ""))
      .join(""),
    fallbackLocale: await detectInputLanguage({
      text: personaImport.context,
    }),
  });

  // Generate system prompt for follow-up interview
  const systemPrompt = personaFollowUpSystemPrompt({
    personaImport: {
      analysis: personaImport.analysis as Partial<PersonaImportAnalysis> | null,
    },
    locale,
  });

  const tools = {
    [BasicToolName.reasoningThinking]: reasoningThinkingTool({
      locale,
      abortSignal,
      statReport: () => Promise.resolve(), // No-op for follow-up interviews
      logger: chatLogger,
    }),
    ...followUpInterviewTools({
      personaImportId: personaImport.id,
      logger: chatLogger,
    }),
  };

  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(userChat.id, {
    tools,
  });

  // 如果需要语音优化，立即启动（不等待）
  if (newMessage.metadata?.shouldCorrectUserMessage && newMessage.id) {
    after(
      correctUserInputMessage({
        userChatId: userChat.id,
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

  // Generate response from LLM
  const streamTextResult = streamText({
    model: llm("gpt-4.1-mini"),
    providerOptions: defaultProviderOptions,
    system:
      systemPrompt +
      // 这个提示永远都可以加着，所以无需判断 shouldCorrectUserMessage 是否有设置，这样最大化 prompt cache 的利用
      (locale === "zh-CN"
        ? "\n\n用户通过语音输入，可能存在语音识别错误，请理解其真实意图。"
        : "\n\nUser input is from voice recognition and may contain transcription errors. Please understand the actual intent."),
    messages: coreMessages,

    tools,

    // 现在这个是默认强制启用的，不支持设置了, see https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0#tool-call-streaming-now-default-toolcallstreaming-removed
    // toolCallStreaming: true,

    // 关键修改：当消息数量达到19条时强制结束访谈
    toolChoice: coreMessages.length < 19 ? "auto" : { type: "tool", toolName: "endInterview" },

    stopWhen: stepCountIs(3),
    temperature: 0.7,

    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),

    onStepFinish: async (step) => {
      appendStepToStreamingMessage(streamingMessage, step);
      if (streamingMessage.parts?.length) {
        await persistentAIMessageToDB({
          userChatId: userChat.id,
          message: streamingMessage,
        });
      }
      const { toolCalls } = step;
      const { tokens, extra } = calculateStepTokensUsage(step);
      chatLogger.info({
        msg: "follow-up interview streamText onStepFinish",
        usage: extra.usage,
        cache: extra.cache,
        toolCalls: toolCalls.map((call) => call.toolName),
      });
      if (statReport) {
        await statReport("tokens", tokens, {
          reportedBy: "persona follow-up interview",
          ...extra,
        });
      }
    },

    onError: ({ error }) => {
      chatLogger.error(`follow-up interview streamText onError: ${(error as Error).message}`);
    },

    onFinish: async () => {},
    abortSignal,
  });

  // after(
  //   new Promise((resolve, reject) => {
  //     streamTextResult
  //       .consumeStream()
  //       .then(() => resolve(null))
  //       .catch((error) => reject(error));
  //   }),
  // );
  after(streamTextResult.consumeStream());

  return streamTextResult.toUIMessageStreamResponse({
    generateMessageId: () => streamingMessage.id,
  });
}
