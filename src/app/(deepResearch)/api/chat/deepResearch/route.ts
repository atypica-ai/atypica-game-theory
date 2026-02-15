import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import authOptions from "@/app/(auth)/authOptions";
import { resolveExpert } from "@/app/(deepResearch)/experts";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  StepResult,
  ToolSet,
} from "ai";
import { getServerSession } from "next-auth";
import { getLocale } from "next-intl/server";
import { NextResponse } from "next/server";
import { ExpertName } from "../../../experts/types";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const payload = await req.json();

  const parseResult = clientMessagePayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    return NextResponse.json({ error }, { status: 400 });
  }
  const { message: newMessage, userChatToken } = parseResult.data;

  // Find UserChat and verify ownership, including messages for query extraction
  const userChat = await prisma.userChat.findUnique({
    where: { token: userChatToken, kind: "misc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!userChat) {
    return NextResponse.json({ error: "UserChat not found" }, { status: 404 });
  }
  if (userChat.userId !== userId) {
    return NextResponse.json(
      { error: "UserChat does not belong to the current user" },
      { status: 403 },
    );
  }

  // Extract expert type from UserChat.context (should always be resolved, no "auto")
  const expert = userChat.context.deepResearchExpert || ExpertName.Grok; // fallback to Grok

  const userChatId = userChat.id;
  const locale = await getLocale();
  const logger = rootLogger.child({ userChatId, expert });
  // 不使用 req.signal
  const abortController = new AbortController();

  // Persist new user message
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
  const query = newMessage.lastPart.type === "text" ? newMessage.lastPart.text : "";
  logger.info({ msg: "Starting DeepResearch stream", expert, userChatId });

  // Create streaming response
  const stream = createUIMessageStream({
    async execute({ writer }) {
      // 准备 streamingMessage（使用 prepareMessagesForStreaming 保持架构一致）
      const { streamingMessage } = await prepareMessagesForStreaming(userChatId, {
        tools: {} as ToolSet, // DeepResearch 的 tools 在 expert 内部，这里传空对象
      });

      // 准备 onStepFinish callback：在外部 append 和保存
      const onStepFinish = async (step: StepResult<ToolSet>) => {
        // 1. 在外部累积 step 到 streamingMessage
        appendStepToStreamingMessage(streamingMessage, step);

        // 2. 立即保存消息
        await persistentAIMessageToDB({
          mode: "override",
          userChatId,
          message: streamingMessage,
        });
      };

      // Call expert executor directly
      const { executor } = resolveExpert(expert);

      await executor({
        query,
        userId,
        locale,
        logger,
        statReport: async () => {}, // Token tracking handled internally
        abortSignal: abortController.signal,
        // UI mode parameters
        streamWriter: writer,
        streamingMessageId: streamingMessage.id,
        onStepFinish,
      });

      logger.info({ msg: "DeepResearch stream completed", expert, userChatId });
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error({ msg: "DeepResearch stream error", error: errorMsg });
      return errorMsg;
    },
  });

  return createUIMessageStreamResponse({ stream });
}
