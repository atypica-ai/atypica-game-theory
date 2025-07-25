import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { llm, providerOptions } from "@/ai/provider";
import authOptions from "@/app/(auth)/authOptions";
import { fetchInterviewSessionByChatToken } from "@/app/(interviewProject)/actions";
import { interviewAgentSystemPrompt } from "@/app/(interviewProject)/prompt";
import { interviewSessionTools } from "@/app/(interviewProject)/tools";
import { interviewSessionChatBodySchema } from "@/app/(interviewProject)/types";
import { rootLogger } from "@/lib/logging";
import { throwServerActionError } from "@/lib/serverAction";
import { CoreMessage, generateId, smoothStream, streamText } from "ai";
import { getServerSession } from "next-auth";
import { getLocale } from "next-intl/server";
import { after, NextResponse } from "next/server";

function setBedrockCache(model: `claude-${string}`, coreMessages: CoreMessage[]) {
  if (!model) return coreMessages; // 这句话没意义，只是为了用一下 model
  const checkpoints = {
    ">=1": false,
    ">=8": false,
  };
  const cachedCoreMessages = coreMessages.map((message, index) => {
    const providerOptions = { bedrock: { cachePoint: { type: "default" } } };
    if (message.role === "assistant" && index >= 1 && !checkpoints[">=1"]) {
      checkpoints[">=1"] = true;
      return { ...message, providerOptions };
    }
    if (message.role === "assistant" && index >= 8 && !checkpoints[">=8"]) {
      checkpoints[">=8"] = true;
      return { ...message, providerOptions };
    }
    return { ...message };
  });
  return cachedCoreMessages;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const payload = await req.json();
  const parseResult = interviewSessionChatBodySchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    return NextResponse.json({ error }, { status: 400 });
  }

  const { message: newMessage, userChatToken } = parseResult.data;

  // Get interview session details
  const sessionResult = await fetchInterviewSessionByChatToken(userChatToken);
  if (!sessionResult.success) {
    throwServerActionError(sessionResult);
  }

  const interviewSession = sessionResult.data;

  if (interviewSession.intervieweeUser?.id !== session.user.id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { project, userChat, intervieweePersona } = interviewSession;

  const chatLogger = rootLogger.child({
    userChatId: userChat.id,
    userChatToken: userChat.token,
    interviewSessionId: interviewSession.id,
    intent: "InterviewSession",
  });

  // Save the latest user message to database
  await persistentAIMessageToDB(userChat.id, {
    ...newMessage,
    id: newMessage.id ?? generateId(),
  });

  const locale = await getLocale();
  const { coreMessages: _coreMessages, streamingMessage } = await prepareMessagesForStreaming(
    userChat.id,
  );
  const coreMessages = setBedrockCache("claude-3-7-sonnet", _coreMessages);

  // Generate system prompt based on interview context
  const isPersonaInterview = !!intervieweePersona;
  const systemPrompt = interviewAgentSystemPrompt({
    brief: project.brief,
    isPersonaInterview: isPersonaInterview,
    personaName: intervieweePersona?.name,
    locale,
  });

  const mergedAbortSignal = AbortSignal.any([req.signal]);

  const streamTextResult = streamText({
    model: llm("claude-3-7-sonnet"),
    providerOptions: {
      ...providerOptions,
    },
    system: systemPrompt,
    messages: coreMessages,
    toolChoice: coreMessages.length < 19 ? "auto" : { type: "tool", toolName: "endInterview" },
    tools: interviewSessionTools({
      interviewSessionId: interviewSession.id,
    }),
    maxSteps: 1, // Keep it simple for interviews
    experimental_generateMessageId: () => streamingMessage.id,
    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),
    abortSignal: mergedAbortSignal,
    onStepFinish: async (step) => {
      const cache = step.providerMetadata?.bedrock?.usage as
        | { cacheReadInputTokens: number; cacheWriteInputTokens: number }
        | undefined;
      appendStepToStreamingMessage(streamingMessage, step);
      if (streamingMessage.parts?.length && streamingMessage.content.trim()) {
        await persistentAIMessageToDB(userChat.id, streamingMessage);
      }
      chatLogger.info({
        msg: "interview session streamText onStepFinish",
        stepType: step.stepType,
        usage: step.usage,
        cache,
        toolCalls: step.toolCalls.map((call) => call.toolName),
        isPersonaInterview,
      });
    },
    onError: ({ error }) => {
      chatLogger.error(`interview session streamText onError: ${(error as Error).message}`);
    },
  });

  after(
    new Promise((resolve, reject) => {
      streamTextResult
        .consumeStream()
        .then(() => {
          resolve(null);
        })
        .catch((error) => {
          reject(error);
        });
    }),
  );

  return streamTextResult.toDataStreamResponse();
}
