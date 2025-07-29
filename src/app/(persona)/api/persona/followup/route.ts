import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import { llm, providerOptions } from "@/ai/provider";
import { reasoningThinkingTool } from "@/ai/tools/experts/reasoning";
import { ToolName } from "@/ai/tools/types";
import { personaFollowUpSystemPrompt } from "@/app/(persona)/prompt";
import { PersonaImportAnalysis } from "@/app/(persona)/types";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { generateId, smoothStream, streamText } from "ai";
import { getLocale } from "next-intl/server";
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
      personaImport: true,
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

  // Save the user message
  await persistentAIMessageToDB(userChat.id, {
    ...newMessage,
    id: newMessage.id ?? generateId(),
  });

  const locale = await getLocale();
  const abortSignal = req.signal;

  const { personaImport } = userChat;
  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(userChat.id);

  // Generate system prompt for follow-up interview
  const systemPrompt = await personaFollowUpSystemPrompt({
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
    },
    toolChoice: "auto",
    maxSteps: 3,
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
      chatLogger.info({
        msg: "follow-up interview streamText onStepFinish",
        stepType: step.stepType,
        toolCalls: step.toolCalls.map((call) => call.toolName),
        usage: step.usage,
      });
    },
    onError: ({ error }) => {
      chatLogger.error(`follow-up interview streamText onError: ${(error as Error).message}`);
    },
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

  return streamTextResult.toDataStreamResponse();
}
