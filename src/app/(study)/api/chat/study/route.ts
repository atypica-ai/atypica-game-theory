import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { clientMessagePayloadSchema } from "@/ai/messageUtilsClient";
import { initStudyStatReporter } from "@/ai/tools/stats";
import authOptions from "@/app/(auth)/authOptions";
import { executeBaseAgentRequest } from "@/app/(study)/agents/baseAgentRequest";
import { createFastInsightAgentConfig } from "@/app/(study)/agents/configs/fastInsightAgentConfig";
import { createPlanModeAgentConfig } from "@/app/(study)/agents/configs/planModeAgentConfig";
import { createProductRnDAgentConfig } from "@/app/(study)/agents/configs/productRnDAgentConfig";
import { createStudyAgentConfig } from "@/app/(study)/agents/configs/studyAgentConfig";
import { noQuotaAgentRequest } from "@/app/(study)/agents/noQuotaAgentRequest";
import { AnalystKind } from "@/app/(study)/context/types";
import { saveAnalystFromPlan } from "@/app/(study)/study/lib";
import { StudyToolName, StudyUITools } from "@/app/(study)/tools/types";
import { VALID_LOCALES } from "@/i18n/routing";
import { rootLogger } from "@/lib/logging";
import { detectInputLanguage } from "@/lib/textUtils";
import { prisma } from "@/prisma/prisma";
import { getUserTokens } from "@/tokens/lib";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  ToolUIPart,
  UIMessageStreamWriter,
} from "ai";
import { getServerSession } from "next-auth/next";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // MOCK: 临时测试用
  const MOCK_ENABLED = false;
  if (MOCK_ENABLED) {
    const stream = createUIMessageStream({
      async execute({ writer }) {
        writer.write({ type: "start" });
        writer.write({ type: "text-start", id: "mock-id" });
        let count = 0;
        while (true) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          count++;
          writer.write({
            type: "text-delta",
            id: "mock-id",
            delta: count.toString().repeat(10) + " ",
          });
        }
      },
    });
    return createUIMessageStreamResponse({ stream });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // const payload = await req.json();
  // const studyUserChatId = parseInt(payload["id"]);
  // const newMessage = payload["message"] as Message | CreateMessage;
  // if (!studyUserChatId || !newMessage) {
  //   return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  // }

  const payload = await req.json();
  const parseResult = clientMessagePayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    return NextResponse.json({ error }, { status: 400 });
  }
  const { message: newMessage, userChatToken } = parseResult.data;

  // 这个要在 prisma.userChat.findUnique 之前执行，因为会更新 analyst.kind
  if (
    newMessage.lastPart.type === `tool-${StudyToolName.makeStudyPlan}` &&
    newMessage.lastPart.state === "output-available"
  ) {
    const toolPart = newMessage.lastPart as Extract<
      ToolUIPart<Pick<StudyUITools, StudyToolName.makeStudyPlan>>,
      { state: "output-available" }
    >;
    if (toolPart.input && toolPart.output.confirmed) {
      await saveAnalystFromPlan({
        userId,
        userChatToken,
        ...toolPart.input,
      });
    }
  }

  // 找到有效的 userChat，并确保有权限
  const userChat = await prisma.userChat.findUnique({
    where: {
      token: userChatToken,
      kind: "study", // 虽然有 Universal Agent，但这里还是要过滤的。这个 API 是只针对 Study Agent 的，Universal Agent 有另外一个 API
    },
  });
  if (!userChat) {
    return NextResponse.json({ error: "UserChat not found" }, { status: 404 });
  }
  if (userChat.userId != userId) {
    return NextResponse.json(
      { error: "UserChat does not belong to the current user" },
      { status: 403 },
    );
  }
  const studyUserChatId = userChat.id;

  const logger = rootLogger.child({ userChatId: studyUserChatId, userChatToken: userChat.token });

  // 首先要把新提交的消息保存
  // 如果是 user message，会新建一条，
  // 如果是 assistant message，一般是 addToolResult 的结果，这时候 messageId 已存在，则更新 tool 的交互结果
  await persistentAIMessageToDB({
    mode: "append",
    userChatId: studyUserChatId,
    message: {
      id: newMessage.id ?? generateId(),
      role: newMessage.role,
      parts: [newMessage.lastPart],
      metadata: newMessage.metadata,
    },
  });

  // 首先遵循用户的输入语言，然后，如果 analyst 语言已经定了，默认使用 analyst 的语言，最后使用客户端语言
  const locale: Locale = await detectInputLanguage({
    text: [newMessage.lastPart].map((part) => (part.type === "text" ? part.text : "")).join(""),
    fallbackLocale:
      userChat.context.defaultLocale && VALID_LOCALES.includes(userChat.context.defaultLocale)
        ? userChat.context.defaultLocale
        : await getLocale(),
  });

  const reqSignal = req.signal;
  // Extract teamId from session (null for personal users)
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });
  const teamId = user.teamIdAsMember;
  const params = {
    locale,
    userChat: {
      ...userChat,
      extra: userChat.extra,
    },
    userId,
    teamId,
    reqSignal,
    logger,
  };
  const { balance } = await getUserTokens({ userId });
  if (balance != "Unlimited" && balance <= 0) {
    return await noQuotaAgentRequest(params);
  }

  const executeAgent = async ({ streamWriter }: { streamWriter: UIMessageStreamWriter }) => {
    const studyUserChatId = userChat.id;

    // Initialize statistics reporter
    const { statReport } = initStudyStatReporter({
      userId,
      studyUserChatId,
      logger,
    });

    // Create abort controllers - must be created here to ensure the same instances
    // are shared between config creation (for tools) and baseAgentRequest (for abort logic)
    const toolAbortController = new AbortController();
    const studyAbortController = new AbortController();

    const agentContext = {
      userId,
      teamId,
      studyUserChatId,
      userChatContext: userChat.context,
      locale,
      logger,
      statReport,
      toolAbortController,
      studyAbortController,
    };

    // Check if this is first-time planning (analyst.kind not set)
    if (!userChat.context.analystKind) {
      // NEW: Plan Mode - Intent Layer for research planning
      const config = await createPlanModeAgentConfig(agentContext);
      await executeBaseAgentRequest(agentContext, config, streamWriter);
    } else if (userChat.context.analystKind === AnalystKind.productRnD) {
      const config = await createProductRnDAgentConfig(agentContext);
      await executeBaseAgentRequest(agentContext, config, streamWriter);
    } else if (userChat.context.analystKind === AnalystKind.fastInsight) {
      const config = await createFastInsightAgentConfig(agentContext);
      await executeBaseAgentRequest(agentContext, config, streamWriter);
    } else {
      const config = await createStudyAgentConfig(agentContext);
      await executeBaseAgentRequest(agentContext, config, streamWriter);
    }
  };

  const stream = createUIMessageStream({
    async execute({ writer }) {
      await executeAgent({ streamWriter: writer });
    },
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        "study chat api onError",
      );
      return errorMsg;
    },
  });
  return createUIMessageStreamResponse({ stream });
}
