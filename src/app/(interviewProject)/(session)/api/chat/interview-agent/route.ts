import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import { initInterviewProjectStatReporter } from "@/ai/tools/stats";
import { fetchInterviewSessionChat } from "@/app/(interviewProject)/actions";
import { rootLogger } from "@/lib/logging";
import { throwServerActionError } from "@/lib/serverAction";
import { InterviewSessionExtra } from "@/prisma/client";
import { mergeExtra } from "@/prisma/utils";
import { getUserTokens } from "@/tokens/lib";
import { createUIMessageStream, createUIMessageStreamResponse, generateId } from "ai";
import { getLocale } from "next-intl/server";
import { NextResponse } from "next/server";
import { runHumanInterview } from "./human";

/**
 * ⚠️ fetchInterviewSessionChat 会检查权限，所以这里无需另外检查权限
 */
export async function POST(req: Request) {
  const payload = await req.json();
  const parseResult = clientMessagePayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    return NextResponse.json({ error }, { status: 400 });
  }

  const { message: newMessage, userChatToken } = parseResult.data;

  const sessionResult = await fetchInterviewSessionChat({ userChatToken });
  if (!sessionResult.success) {
    throwServerActionError(sessionResult);
  }

  const interviewSession = sessionResult.data;
  const { interviewSessionId, project, userChatId, extra: sessionExtra } = interviewSession;

  // Check and set interview session status if needed
  if (!sessionExtra.ongoing || !sessionExtra.startsAt) {
    await mergeExtra({
      tableName: "InterviewSession",
      id: interviewSessionId,
      extra: {
        ongoing: true,
        startsAt: Date.now(),
      } satisfies InterviewSessionExtra,
    });
  }

  const chatLogger = rootLogger.child({
    userChatId,
    userChatToken,
    interviewSessionId,
  });

  const { statReport } = initInterviewProjectStatReporter({
    userId: project.user.id, // ⚠️ 这里是 project owner 的 userId，不是正在被访谈的 userId
    interviewProjectId: project.id,
    sessionUserChatId: userChatId,
    logger: chatLogger,
  });

  // Save the latest user message to database
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

  // Check token balance before processing
  const projectOwnerId = project.user.id;
  const { balance } = await getUserTokens({ userId: projectOwnerId });

  if (balance !== "Unlimited" && balance <= 0) {
    // Write error to session extra
    await mergeExtra({
      tableName: "InterviewSession",
      id: interviewSessionId,
      extra: {
        error: "insufficient_balance",
        ongoing: true,
      } satisfies InterviewSessionExtra,
    });

    // Return paused message (vague for interviewees)
    const locale = await getLocale();
    const message = locale === "zh-CN" ? "访谈已暂停。" : "Interview paused.";

    const stream = createUIMessageStream({
      execute({ writer }) {
        writer.write({ type: "start" });
        writer.write({ type: "text-start", id: "paused" });
        writer.write({ type: "text-delta", id: "paused", delta: message });
        writer.write({ type: "text-end", id: "paused" });
        writer.write({ type: "finish" });
      },
    });

    return createUIMessageStreamResponse({ stream });
  }

  const mergedAbortSignal = AbortSignal.any([req.signal]);

  const stream = createUIMessageStream({
    async execute({ writer }) {
      await runHumanInterview({
        statReport,
        logger: chatLogger,
        abortSignal: mergedAbortSignal,
        // Type cast: ClientMessagePayload uses generic UITools, but runHumanInterview
        // expects specific TInterviewUITools. Runtime value is correct, TS just can't infer it.
        newMessage: newMessage as Parameters<typeof runHumanInterview>[0]["newMessage"],
        interviewSession,
        streamWriter: writer,
      });
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error);
      chatLogger.error(errorMsg);
      return errorMsg;
    },
  });

  return createUIMessageStreamResponse({ stream });
}
