import { personaAgentSystem } from "@/ai/prompt";
import { fixFileNameInMessageToUsePromptCache, llm, providerOptions } from "@/ai/provider";
import { fetchPersonaById } from "@/app/(legacy)/personas/actions";
import { authOptions } from "@/lib/auth";
import { convertToCoreMessages, Message, smoothStream, streamText } from "ai";
import { getServerSession } from "next-auth/next";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // 需要登录，但是没有其他特别权限
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json();
  const personaId = parseInt(payload["id"]);
  const messages = payload["messages"] as Message[];
  if (!personaId || !messages) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await fetchPersonaById(personaId);
  if (!result.success) {
    notFound();
  }
  const persona = result.data;

  const coreMessages = convertToCoreMessages(messages);
  const firstAssistantMessage = coreMessages.find((message) => message.role === "assistant");
  if (firstAssistantMessage) {
    firstAssistantMessage.providerOptions = {
      bedrock: {
        cachePoint: { type: "default" },
      },
    };
  }

  const streamTextResult = streamText({
    model: fixFileNameInMessageToUsePromptCache(llm("claude-3-7-sonnet")),
    // model: llm("gemini-2.5-flash", {
    //   useSearchGrounding: true,
    //   dynamicRetrievalConfig: {
    //     mode: "MODE_DYNAMIC",
    //     dynamicThreshold: 0.5,
    //   },
    // }),
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
    abortSignal: req.signal,
    // onStepFinish: async ({ usage, providerMetadata }) => {
    //   console.log("usage", usage);
    //   console.log("cache", providerMetadata?.bedrock?.usage);
    // },
    onError: ({ error }) => {
      console.log("Error occurred:", JSON.stringify(error));
    },
  });

  return streamTextResult.toDataStreamResponse();
}
