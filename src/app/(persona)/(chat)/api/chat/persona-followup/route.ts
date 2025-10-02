import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import { llm, providerOptions } from "@/ai/provider";
import { reasoningThinkingTool } from "@/ai/tools/experts/reasoning";
import { initPersonaImportStatReporter } from "@/ai/tools/stats";
import { ToolName } from "@/ai/tools/types";
import { personaFollowUpSystemPrompt } from "@/app/(persona)/prompt";
import { followUpInterviewTools } from "@/app/(persona)/tools";
import { PersonaImportAnalysis } from "@/app/(persona)/types";
import { rootLogger } from "@/lib/logging";
import { detectInputLanguage } from "@/lib/textUtils";
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
  await persistentAIMessageToDB(userChat.id, {
    ...newMessage,
    id: newMessage.id ?? generateId(),
  });

  const abortSignal = req.signal;

  const { personaImport } = userChat;
  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(userChat.id);

  // 动态检测用户输入的语言，先检测用户输入的语言，默认使用用户导入的访谈文件的语言 (context 内容)
  const locale = await detectInputLanguage({
    text: newMessage.content,
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

  // Generate response from LLM
  const streamTextResult = streamText({
    model: llm("gpt-4.1-mini"),
    providerOptions,
    system: systemPrompt,
    messages: coreMessages,

    tools: {
      [ToolName.reasoningThinking]: reasoningThinkingTool({
        locale,
        abortSignal,
        statReport: () => Promise.resolve(), // No-op for follow-up interviews
        logger: chatLogger,
      }),
      ...followUpInterviewTools({
        personaImportId: personaImport.id,
        logger: chatLogger,
      }),
    },

    experimental_toolCallStreaming: true,

    // 关键修改：当消息数量达到19条时强制结束访谈
    toolChoice: coreMessages.length < 19 ? "auto" : { type: "tool", toolName: "endInterview" },

    stopWhen: stepCountIs(3),
    temperature: 0.7,
    experimental_generateMessageId: () => streamingMessage.id,

    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),

    onStepFinish: async (step) => {
      appendStepToStreamingMessage(streamingMessage, step);
      if (streamingMessage.parts?.length && streamingMessage.content.trim()) {
        await persistentAIMessageToDB(userChat.id, streamingMessage);
      }
      const { usage, stepType, toolCalls } = step;
      chatLogger.info({
        msg: "follow-up interview streamText onStepFinish",
        stepType,
        usage,
        toolCalls: toolCalls.map((call) => call.toolName),
      });
      if (usage.totalTokens > 0) {
        const tokens = usage.totalTokens;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extra: any = {
          reportedBy: "persona follow-up interview",
          usage,
        };
        await statReport("tokens", tokens, extra);
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

  return streamTextResult.toUIMessageStreamResponse();
}
