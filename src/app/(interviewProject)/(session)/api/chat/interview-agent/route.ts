import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import { initInterviewProjectStatReporter } from "@/ai/tools/stats";
import { fetchInterviewSessionChat } from "@/app/(interviewProject)/actions";
import { rootLogger } from "@/lib/logging";
import { throwServerActionError } from "@/lib/serverAction";
import { InterviewSessionExtra } from "@/prisma/client";
import { mergeExtra } from "@/prisma/utils";
import { createUIMessageStream, createUIMessageStreamResponse, generateId } from "ai";
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
    userChatId,
    message: {
      ...newMessage,
      id: newMessage.id ?? generateId(),
    },
  });

  const mergedAbortSignal = AbortSignal.any([req.signal]);

  const stream = createUIMessageStream({
    async execute({ writer }) {
      await runHumanInterview({
        statReport,
        logger: chatLogger,
        abortSignal: mergedAbortSignal,
        newMessage,
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
