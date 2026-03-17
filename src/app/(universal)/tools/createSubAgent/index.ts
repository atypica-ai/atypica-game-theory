import "server-only";

import { initStudyStatReporter } from "@/ai/tools/stats";
import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import { AgentRequestConfig, executeBaseAgentRequest } from "@/app/(study)/agents/baseAgentRequest";
import { waitUntil } from "@vercel/functions";
import { tool } from "ai";
import { createUniversalSubAgentConfig, type SkillDrivenSubAgentTools } from "./config";
import { type SubAgentMode } from "./prompt";
import {
  appendForcedInstruction,
  appendInitialTaskMessage,
  buildReportEnforcementInstruction,
  buildSubAgentStartSummary,
  createSubAgentChat,
  createSubAgentLogger,
  getLatestAssistantText,
  hasAnyReportToken,
  type SubAgentExecutionContext,
} from "./runtime";
import {
  createSubAgentInputSchema,
  createSubAgentOutputSchema,
  type CreateSubAgentToolResult,
} from "./types";

type SubAgentConfigFactory = (
  executionContext: SubAgentExecutionContext,
  toolAbortSignal: AbortSignal,
) => Promise<AgentRequestConfig<SkillDrivenSubAgentTools>>;

async function createSkillDrivenSubAgentConfig(
  executionContext: SubAgentExecutionContext,
  toolAbortSignal: AbortSignal,
): Promise<AgentRequestConfig<SkillDrivenSubAgentTools>> {
  const { userId, locale, logger, statReport, userChatId, userChatToken, mode } = executionContext;
  return createUniversalSubAgentConfig({
    userId,
    subAgentChatId: userChatId,
    subAgentChatToken: userChatToken,
    locale,
    logger,
    statReport,
    toolAbortSignal,
    mode,
  });
}

async function executeSubAgentWithConfig({
  executionContext,
  forcedInstruction,
  createConfig,
}: {
  executionContext: SubAgentExecutionContext;
  forcedInstruction?: string;
  createConfig: SubAgentConfigFactory;
}) {
  const { userId, teamId, locale, logger, statReport, userChatId } = executionContext;
  await appendForcedInstruction({ userChatId, forcedInstruction });

  await executeBaseAgentRequest(
    {
      userId,
      teamId,
      studyUserChatId: userChatId,
      userChatContext: {
        defaultLocale: locale,
      },
      locale,
      logger,
      statReport,
    },
    async (toolAbortSignal) => createConfig(executionContext, toolAbortSignal),
    undefined,
    { executionMode: "blocking" },
  );
}

async function runExecutorSequence({
  executionContext,
  runExecutor,
}: {
  executionContext: SubAgentExecutionContext;
  runExecutor: (forcedInstruction?: string) => Promise<void>;
}) {
  await runExecutor();
  // In non-flexible modes we expect a reusable artifact when the task warrants it,
  // so we give the same sub-agent one more turn with an explicit report instruction.
  if (
    executionContext.mode !== "flexible" &&
    !(await hasAnyReportToken(executionContext.userChatId))
  ) {
    await runExecutor(buildReportEnforcementInstruction({ locale: executionContext.locale }));
  }
}

async function logSubAgentCompletion({
  logger,
  userChatId,
  message,
}: {
  logger: AgentToolConfigArgs["logger"];
  userChatId: number;
  message: string;
}) {
  const latestAssistantText = await getLatestAssistantText(userChatId);
  logger.info({
    msg: message,
    latestAssistantText,
  });
}

async function runSubAgent({ executionContext }: { executionContext: SubAgentExecutionContext }) {
  try {
    await runExecutorSequence({
      executionContext,
      runExecutor: (forcedInstruction) =>
        executeSubAgentWithConfig({
          executionContext,
          forcedInstruction,
          createConfig: createSkillDrivenSubAgentConfig,
        }),
    });
    await logSubAgentCompletion({
      logger: executionContext.logger,
      userChatId: executionContext.userChatId,
      message: "Study sub-agent completed",
    });
  } catch (error) {
    executionContext.logger.error({
      msg: "Study sub-agent failed in detached run",
      error: (error as Error).message,
    });
  }
}

export const createSubAgentTool = ({
  userId,
  teamId,
  locale,
  logger,
}: {
  userId: number;
  teamId: number | null;
} & AgentToolConfigArgs) =>
  tool({
    description:
      "Create and run a Study sub-agent for one focused research task. Use this as the main execution path for interview/discussion/report style study work.",
    inputSchema: createSubAgentInputSchema,
    outputSchema: createSubAgentOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => ({
      type: "text",
      value: result.plainText,
    }),
    execute: async ({
      taskRequirement,
      outputFormat,
      mode,
      subAgentTitle,
    }): Promise<CreateSubAgentToolResult> => {
      let subAgentChat: Awaited<ReturnType<typeof createSubAgentChat>> | null = null;

      try {
        subAgentChat = await createSubAgentChat({
          userId,
          locale,
          taskRequirement,
          subAgentTitle,
        });

        const subAgentLogger = createSubAgentLogger({
          logger,
          subAgentChatId: subAgentChat.id,
          subAgentChatToken: subAgentChat.token,
        });

        await appendInitialTaskMessage({
          userChatId: subAgentChat.id,
          taskRequirement,
          outputFormat,
        });

        const { statReport } = initStudyStatReporter({
          userId,
          studyUserChatId: subAgentChat.id,
          logger: subAgentLogger,
        });

        const executionContext: SubAgentExecutionContext = {
          userId,
          teamId,
          locale,
          logger: subAgentLogger,
          statReport,
          userChatId: subAgentChat.id,
          userChatToken: subAgentChat.token,
          mode: mode as SubAgentMode,
        };

        // The tool should return immediately with the child chat reference while the
        // sub-agent continues running in the background and streams into that chat.
        waitUntil(runSubAgent({ executionContext }).catch(() => {}));

        const resultSummary = buildSubAgentStartSummary({
          locale,
          userChatToken: subAgentChat.token,
        });

        return {
          status: "running",
          resultSummary,
          plainText: resultSummary,
          subAgentChatId: subAgentChat.id,
          subAgentChatToken: subAgentChat.token,
        };
      } catch (error) {
        if (!subAgentChat) {
          throw error;
        }
        const errorMessage = (error as Error).message || "failed to initialize sub-agent";
        logger.error({
          msg: "createSubAgent initialization failed after chat created",
          error: errorMessage,
          subAgentChatId: subAgentChat.id,
          subAgentChatToken: subAgentChat.token,
        });
        return {
          status: "failed",
          resultSummary: errorMessage,
          plainText: `Task initialization failed: ${errorMessage}`,
          subAgentChatId: subAgentChat.id,
          subAgentChatToken: subAgentChat.token,
        };
      }
    },
  });
