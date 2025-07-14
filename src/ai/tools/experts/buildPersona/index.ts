import "server-only";

import { convertStepsToAIMessage, prepareMessagesForStreaming } from "@/ai/messageUtils";
import { buildPersonaSystem } from "@/ai/prompt";
import { llm, LLMModelName, providerOptions } from "@/ai/provider";
import { handleToolCallError, savePersonaTool } from "@/ai/tools/tools";
import { AgentToolConfigArgs, PlainTextToolResult, ToolName } from "@/ai/tools/types";
import { prisma } from "@/prisma/prisma";
import { DataStreamWriter, Message, streamText, tool } from "ai";
import { z } from "zod";
import { BuildPersonaToolResult } from "./types";

type TReduceTokens = {
  model: LLMModelName;
  ratio: number;
} | null;

export const buildPersonaTool = ({
  userId,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  userId: number;
} & AgentToolConfigArgs) =>
  tool({
    description:
      "Analyze social media data from user profile search tasks, create detailed user personas, and build AI agents that simulate realistic user behavior and decision-making patterns",
    parameters: z.object({
      scoutUserChatToken: z
        .string()
        .describe(
          "Token from the completed user profile search task (scoutTaskChat). Must use the actual token from current research session - do not fabricate or reuse old tokens",
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
      const mergedAbortSignal = AbortSignal.any([
        abortSignal,
        AbortSignal.timeout(10 * 60 * 1000), // 10 分钟超时
      ]);
      await runBuildPersona({
        locale,
        scoutUserChatId,
        abortSignal: mergedAbortSignal,
        statReport,
        logger,
      });
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
        // 遇到这个情况，有一种可能是用了 gemini 2.5 flash 模型，一次工具都没调用最后结束了 streamText，这个情况还是先抛出错误
        logger.error("No persona built");
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
  locale,
  statReport,
  abortSignal,
  logger,
  scoutUserChatId,
  streamWriter,
}: {
  scoutUserChatId: number;
  streamWriter?: DataStreamWriter;
} & AgentToolConfigArgs) {
  const { coreMessages } = await prepareMessagesForStreaming(scoutUserChatId);
  const lastAssistantMessage = coreMessages.findLast((message) => message.role === "assistant");
  if (lastAssistantMessage) {
    lastAssistantMessage.providerOptions = {
      bedrock: {
        cachePoint: { type: "default" },
      },
    };
  }
  const streamTextPromise = new Promise<Omit<Message, "role">>((resolve, reject) => {
    // 如果是一个个调用 savePersona，
    //  需要 maxSteps 调大，并且设置 parallel: false，模型只能用 claude，因为需要 cache
    //  但是不能太多 steps，虽然有 cache，savePersona 的 tool message 会被重复传给 llm
    // 如果是批量调用 savePersona，目前支持最好的是 gemini-2.5-pro，但是这样太慢
    // const reduceTokens = { model: "gemini-2.5-pro", ratio: 2 } as TReduceTokens | null;
    const reduceTokens = { model: "gemini-2.5-flash", ratio: 10 } as TReduceTokens | null;
    const llmOptions = undefined;
    const maxSteps = 5;
    const response = streamText({
      // claude-3-7-sonnet 目前会遇到 input tokens context 不够大的问题，但 gpt 4.1 mini 和 gemini 2.5 flash 没问题
      model: reduceTokens ? llm(reduceTokens.model, llmOptions) : llm("claude-3-7-sonnet"),
      providerOptions: providerOptions,
      system: buildPersonaSystem({
        locale,
        parallel: false, // gemini 可以开启, claude 不支持
      }),
      messages: coreMessages,
      tools: {
        [ToolName.savePersona]: savePersonaTool({ scoutUserChatId, statReport }),
        // [ToolName.toolCallError]: toolCallError,
      },
      toolChoice: "required",
      // toolChoice: {
      //   type: "tool",
      //   toolName: ToolName.savePersona,
      // },
      maxSteps,
      // toolCallStreaming: true,  // gemini 这个会有问题，会出现所有字段值都是 placeholder
      experimental_repairToolCall: handleToolCallError, // claude-3-7-sonnet 需要这个，savePersona 有时候会用 json 字符串作为参数
      onChunk: async ({ chunk }) => {
        logger.debug({ chunk });
      },
      onStepFinish: async (step) => {
        const cache = step.providerMetadata?.bedrock?.usage as
          | { cacheReadInputTokens: number; cacheWriteInputTokens: number }
          | undefined;
        const toolCalls = step.toolCalls.map((call) => call.toolName);
        const usage = step.usage;
        logger.info({
          msg: "runBuildPersona streamText onStepFinish",
          stepType: step.stepType,
          toolCalls,
          usage,
          cache,
          providerMetadata: step.providerMetadata,
        });
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
            tokens +=
              Math.floor((cache?.cacheReadInputTokens || 0) / 10) +
              Math.floor((cache?.cacheWriteInputTokens || 0) * 1.25);
            promises.push(statReport("tokens", tokens, extra));
          }
          await Promise.all(promises);
        }
      },
      onFinish: async ({ steps, usage, providerMetadata }) => {
        const cache = providerMetadata?.bedrock?.usage;
        logger.info({ msg: "runBuildPersona streamText onFinish", usage, cache });
        const message = convertStepsToAIMessage(steps);
        resolve(message);
      },
      onError: ({ error }) => {
        if ((error as Error).name === "AbortError") {
          logger.warn(`runBuildPersona streamText aborted: ${(error as Error).message}`);
        } else {
          logger.error(`runBuildPersona streamText onError: ${(error as Error).message}`);
          reject(error);
        }
      },
      abortSignal,
    });
    if (streamWriter) {
      response.mergeIntoDataStream(streamWriter);
    }
    abortSignal.addEventListener("abort", () => {
      reject(new Error("runBuildPersona abortSignal received"));
    });
    response
      .consumeStream()
      .then(() => {})
      .catch((error) => reject(error));
  });

  await streamTextPromise;
}
