import { llm, LLMModelName, providerOptions } from "@/ai/llm";
import { convertStepsToAIMessage, prepareMessagesForStreaming } from "@/ai/messageUtils";
import { buildPersonaSystem } from "@/ai/prompt";
import { PlainTextToolResult } from "@/ai/tools";
import { prisma } from "@/prisma/prisma";
import { DataStreamWriter, Message, streamText, tool } from "ai";
import { Logger } from "pino";
import { z } from "zod";
import { savePersonaTool, StatReporter, ToolName } from "..";

export type TPersonaForStudy = {
  personaId: number;
  name: string;
  tags: string[];
  source: string;
};

const REDUCE_TOKENS: {
  model: LLMModelName;
  ratio: number;
} = {
  model: "gemini-2.5-pro",
  ratio: 2,
};

export interface BuildPersonaToolResult extends PlainTextToolResult {
  personas: TPersonaForStudy[];
  plainText: string;
}

export const buildPersonaTool = ({
  userId,
  abortSignal,
  statReport,
  studyLog,
}: {
  userId: number;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  studyLog: Logger;
}) =>
  tool({
    description:
      "分析用户画像搜索任务（scoutTaskChat）的结果，归纳总结，构可以建模拟用户行为和决策的智能体",
    parameters: z.object({
      scoutUserChatToken: z
        .string()
        .describe(
          "用户画像搜索任务（scoutTaskChat）的 token，必须使用本次研究中搜索任务的 token，不能编造",
        ),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ scoutUserChatToken }): Promise<BuildPersonaToolResult> => {
      const scoutUserChat = await prisma.userChat.findUnique({
        where: { token: scoutUserChatToken, kind: "scout", userId },
      });
      if (!scoutUserChat) {
        return {
          personas: [],
          plainText: `scoutUserChat ${scoutUserChatToken} not found`,
        };
      }
      const scoutUserChatId = scoutUserChat.id;
      try {
        await runBuildPersona({
          scoutUserChatId,
          abortSignal,
          statReport,
          studyLog,
        });
      } catch (error) {
        studyLog.error(`runBuildPersona failed: ${(error as Error).message}`);
        throw error;
      }
      const personas = (
        await prisma.persona.findMany({
          where: { scoutUserChatId },
        })
      ).map((persona) => ({
        personaId: persona.id,
        name: persona.name,
        tags: persona.tags as string[],
        source: persona.source,
      }));
      if (personas.length === 0) {
        studyLog.error("No persona built");
        throw new Error("No persona built");
      }
      if (statReport) {
        await statReport("personas", personas.length, {
          reportedBy: "buildPersona tool",
          scoutUserChatId,
          personaIds: personas.map((persona) => persona.personaId),
        });
      }
      return {
        personas,
        plainText: `${personas.length} personas build: ${JSON.stringify(personas)}`,
      };
    },
  });

export async function runBuildPersona({
  scoutUserChatId,
  statReport,
  abortSignal,
  studyLog,
  streamWriter,
}: {
  scoutUserChatId: number;
  statReport: StatReporter;
  abortSignal: AbortSignal;
  studyLog: Logger;
  streamWriter?: DataStreamWriter;
}) {
  const { coreMessages } = await prepareMessagesForStreaming(scoutUserChatId);
  const streamTextPromise = new Promise<Omit<Message, "role">>((resolve, reject) => {
    const reduceTokens = REDUCE_TOKENS as typeof REDUCE_TOKENS | null;
    const response = streamText({
      model: reduceTokens ? llm("gemini-2.5-pro") : llm("claude-3-7-sonnet"),
      providerOptions: providerOptions,
      system: buildPersonaSystem(),
      messages: coreMessages,
      tools: {
        [ToolName.savePersona]: savePersonaTool({ scoutUserChatId, statReport }),
        // [ToolName.toolCallError]: toolCallError,
      },
      toolChoice: {
        type: "tool",
        toolName: ToolName.savePersona,
      },
      maxSteps: 1,
      // toolCallStreaming: true,  // gemini 这个会有问题，会出现所有字段值都是 placeholder
      // experimental_repairToolCall: handleToolCallError,
      onChunk: async ({ chunk }) => {
        studyLog.debug({ chunk });
      },
      onStepFinish: async (step) => {
        const toolCalls = step.toolCalls.map((call) => call.toolName);
        const usage = step.usage;
        studyLog.info({ msg: "Step finished", stepType: step.stepType, toolCalls, usage });
        if (statReport) {
          const reportedBy = "buildPersona tool";
          const promises = [
            statReport("steps", toolCalls.length, { reportedBy, scoutUserChatId, toolCalls }),
          ];
          if (usage.totalTokens > 0) {
            let tokens = usage.totalTokens;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const extra: any = { reportedBy, scoutUserChatId, usage };
            if (reduceTokens) {
              extra["reduceTokens"] = { originalTokens: tokens, ...reduceTokens };
              tokens = Math.ceil(tokens / reduceTokens.ratio);
            }
            promises.push(statReport("tokens", tokens, extra));
          }
          await Promise.all(promises);
        }
      },
      onFinish: async ({ steps, usage }) => {
        studyLog.info({ msg: "runBuildPersona streamText onFinish", usage });
        const message = convertStepsToAIMessage(steps);
        resolve(message);
      },
      onError: ({ error }) => {
        studyLog.error(`runBuildPersona streamText onError: ${(error as Error).message}`);
        reject(error);
      },
      abortSignal,
    });
    if (streamWriter) {
      response.mergeIntoDataStream(streamWriter);
    }
    response.consumeStream().catch((error) => reject(error));
  });

  try {
    const message = await streamTextPromise;
    studyLog.info(`message stream complete: ${message.content.substring(0, 20)}`);
  } catch (error) {
    const errMsg = (error as Error).message;
    studyLog.error(`message stream error: ${errMsg}`);
    throw error;
  }
}
