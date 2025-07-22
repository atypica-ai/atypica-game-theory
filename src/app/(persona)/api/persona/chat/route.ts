import { personaAgentSystem } from "@/ai/prompt";
import { llm, providerOptions } from "@/ai/provider";
import { checkPersonaAccess } from "@/app/(persona)/actions";
import { convertToCoreMessages, Message, smoothStream, streamText } from "ai";
import { getLocale } from "next-intl/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const payload = await req.json();
  const personaId = parseInt(payload["id"]);
  const messages = payload["messages"] as Message[];

  if (!personaId || !messages) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Check access permission
  const accessResult = await checkPersonaAccess(personaId);
  if (!accessResult.success) {
    return NextResponse.json(
      { error: accessResult.message },
      { status: accessResult.code === "unauthorized" ? 401 : accessResult.code === "not_found" ? 404 : 403 }
    );
  }

  const persona = accessResult.data;

  const coreMessages = convertToCoreMessages(messages);
  const firstAssistantMessage = coreMessages.find((message) => message.role === "assistant");
  if (firstAssistantMessage) {
    firstAssistantMessage.providerOptions = {
      bedrock: {
        cachePoint: { type: "default" },
      },
    };
  }

  const mergedAbortSignal = AbortSignal.any([
    req.signal,
    // AbortSignal.timeout(1), //test purpose
  ]);
  mergedAbortSignal.addEventListener("abort", (ev) => {
    console.log(`aborted`, ev);
  });

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
    system: personaAgentSystem({ persona, locale: await getLocale() }),
    messages: coreMessages,
    tools: {
      // [ToolName.dySearch]: dySearchTool,
      // [ToolName.insSearch]: insSearchTool,
      // [ToolName.tiktokSearch]: tiktokSearchTool,
      // [ToolName.xhsSearch]: xhsSearchTool,  // 太贵了，先不用
      // [ToolName.reasoningThinking]: reasoningThinkingTool(),
    },
    maxSteps: 2,
    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),
    abortSignal: mergedAbortSignal,
    onStepFinish: async ({ usage, providerMetadata }) => {
      console.log("persona chat streamTextResult onStepFinish, usage:", usage);
      console.log(
        "persona chat streamTextResult onStepFinish, cache:",
        providerMetadata?.bedrock?.usage,
      );
    },
    onFinish: async () => {
      console.log("persona chat streamTextResult onFinish");
    },
    onError: ({ error }) => {
      console.log("Error occurred:", JSON.stringify(error));
    },
  });

  streamTextResult
    .consumeStream()
    .then(() => {
      // abortSignal 发生了以后，会进 then，不过 consumeStream 的 then 是没有 resolve 的内容的
      console.log("persona chat streamTextResult.consumeStream() resolved");
    })
    .catch((err) => {
      console.log("err", err);
    });

  return streamTextResult.toDataStreamResponse();
}
