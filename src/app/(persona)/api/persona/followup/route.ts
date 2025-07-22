import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { llm, providerOptions } from "@/ai/provider";
import { reasoningThinkingTool } from "@/ai/tools/experts/reasoning";
import { ToolName } from "@/ai/tools/types";
import authOptions from "@/app/(auth)/authOptions";
import { personaFollowUpSystemPrompt } from "@/app/(persona)/prompt";
import { FollowUpChatBodySchema, PersonaImportAnalysis } from "@/app/(persona)/types";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { generateId, smoothStream, streamText } from "ai";
import { getServerSession } from "next-auth";
import { getLocale } from "next-intl/server";
import { after, NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const payload = await req.json();
  const parseResult = FollowUpChatBodySchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    return NextResponse.json({ error }, { status: 400 });
  }

  const locale = await getLocale();
  const { message: newMessage, userChatId } = parseResult.data;

  // Verify the UserChat exists and is of the correct type
  const userChat = await prisma.userChat.findUnique({
    where: { id: userChatId, kind: "interviewSession" },
    include: {
      user: true,
    },
  });

  if (!userChat) {
    return NextResponse.json({ error: "Follow-up interview not found" }, { status: 404 });
  }

  // Check if user owns this chat
  if (userChat.userId !== session.user.id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Find the associated PersonaImport to get the supplementary questions context
  const personaImport = await prisma.personaImport.findFirst({
    where: { extraUserChatId: userChatId },
  });

  if (!personaImport) {
    return NextResponse.json({ error: "Associated persona import not found" }, { status: 404 });
  }

  // Double check that the persona import belongs to the same user
  if (personaImport.userId !== session.user.id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Save the user message
  await persistentAIMessageToDB(userChatId, {
    ...newMessage,
    id: newMessage.id ?? generateId(),
  });

  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(userChatId);

  const abortSignal = req.signal;
  const chatLogger = rootLogger.child({
    userChatId,
    personaImportId: personaImport.id,
    chatKind: "followUpInterview",
  });

  // Generate system prompt for follow-up interview
  const systemPrompt = await personaFollowUpSystemPrompt({
    personaImport: {
      analysis: personaImport.analysis as Partial<PersonaImportAnalysis> | null,
    },
    locale,
  });

  // Generate response from LLM
  const streamTextResult = streamText({
    model: llm("claude-3-7-sonnet"),
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
        await persistentAIMessageToDB(userChatId, streamingMessage);
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

  after(
    new Promise((resolve, reject) => {
      streamTextResult
        .consumeStream()
        .then(() => resolve(null))
        .catch((error) => reject(error));
    }),
  );

  return streamTextResult.toDataStreamResponse();
}
