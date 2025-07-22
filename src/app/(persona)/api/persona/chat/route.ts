import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { personaAgentSystem } from "@/ai/prompt";
import { llm, providerOptions } from "@/ai/provider";
import authOptions from "@/app/(auth)/authOptions";
import { fetchUserPersonaChatByToken } from "@/app/(persona)/actions";
import { personaChatBodySchema } from "@/app/(persona)/types";
import { rootLogger } from "@/lib/logging";
import { generateId, smoothStream, streamText } from "ai";
import { getServerSession } from "next-auth";
import { getLocale } from "next-intl/server";
import { after, NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const payload = await req.json();
  const parseResult = personaChatBodySchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    return NextResponse.json({ error }, { status: 400 });
  }

  const { message: newMessage, userChatToken } = parseResult.data;

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

  // Save the latest user message to database
  await persistentAIMessageToDB(userChat.id, {
    ...newMessage,
    id: newMessage.id ?? generateId(),
  });

  const locale = await getLocale();
  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(userChat.id);

  const mergedAbortSignal = AbortSignal.any([
    req.signal,
    // AbortSignal.timeout(1), // test purpose
  ]);
  // mergedAbortSignal.addEventListener("abort", (ev) => {
  //   console.log(`aborted`, ev);
  // });

  const streamTextResult = streamText({
    // model: fixFileNameInMessageToUsePromptCache(llm("claude-3-7-sonnet")),
    // model: llm("gpt-4.1-mini"),
    model: llm("gemini-2.5-flash", {
      useSearchGrounding: true,
      dynamicRetrievalConfig: {
        mode: "MODE_DYNAMIC",
        dynamicThreshold: 0.3, // threshold 越小，使用搜索的可能性就越高
      },
    }),
    providerOptions: {
      ...providerOptions,
      // google: {
      //   thinkingConfig: {
      //     thinkingBudget: 2048, // Optional
      //     includeThoughts: true,
      //   },
      // } satisfies GoogleGenerativeAIProviderOptions,
    },
    system: personaAgentSystem({ persona, locale }),
    messages: coreMessages,
    tools: {
      // [ToolName.dySearch]: dySearchTool,
      // [ToolName.insSearch]: insSearchTool,
      // [ToolName.tiktokSearch]: tiktokSearchTool,
      // [ToolName.xhsSearch]: xhsSearchTool,  // 太贵了，先不用
      // [ToolName.reasoningThinking]: reasoningThinkingTool(),
    },
    maxSteps: 2,
    experimental_generateMessageId: () => streamingMessage.id,
    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),
    abortSignal: mergedAbortSignal,
    onStepFinish: async (step) => {
      appendStepToStreamingMessage(streamingMessage, step);
      if (streamingMessage.parts?.length && streamingMessage.content.trim()) {
        await persistentAIMessageToDB(userChat.id, streamingMessage);
      }
      chatLogger.info({
        msg: "persona user chat streamText onStepFinish",
        stepType: step.stepType,
        // toolCalls: step.toolCalls.map((call) => call.toolName),
        usage: step.usage,
      });
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

  return streamTextResult.toDataStreamResponse();
}
