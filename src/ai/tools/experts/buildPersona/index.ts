import "server-only";

import { prepareMessagesForStreaming } from "@/ai/messageUtils";
import { buildPersonaSystem } from "@/ai/prompt";
import { defaultProviderOptions, llm, LLMModelName } from "@/ai/provider";
import { scoutChatTools } from "@/ai/tools/experts/scoutTaskChat/types";
import { handleToolCallError, savePersonaTool, toolCallError } from "@/ai/tools/tools";
import { AgentToolConfigArgs, PlainTextToolResult, ToolName } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import { prisma } from "@/prisma/prisma";
import { ModelMessage, stepCountIs, streamText, tool, UIMessageStreamWriter } from "ai";
import { Locale } from "next-intl";
import {
  buildPersonaInputSchema,
  buildPersonaOutputSchema,
  type BuildPersonaToolResult,
  type TPersonaForStudy,
} from "./types";

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
    inputSchema: buildPersonaInputSchema,
    outputSchema: buildPersonaOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
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
      let personas: TPersonaForStudy[] = [];
      let noPersonaFallback = false; // gemini 搞不定，改用 claude
      while (true) {
        await runBuildPersona({
          locale,
          scoutUserChatId,
          abortSignal: mergedAbortSignal,
          statReport,
          logger,
          noPersonaFallback,
        });
        personas = (await prisma.persona.findMany({ where: { scoutUserChatId } })).map(
          (persona) => ({
            personaId: persona.id,
            name: persona.name,
            tags: persona.tags as string[],
            source: persona.source,
          }),
        );
        if (personas.length === 0) {
          // 遇到这个情况，有一种可能是用了 gemini 2.5 flash 模型，一次工具都没调用最后结束了 streamText，这个情况是再试一次，使用 claude
          // see https://github.com/bmrlab/atypica-llm-app/issues/96
          if (!noPersonaFallback) {
            noPersonaFallback = true;
            logger.warn("No persona built, retrying with claude-3-7-sonnet");
          } else {
            logger.error("No persona built");
            throw new Error("No persona built");
          }
        } else {
          break;
        }
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

function appendBuildPersonaPrologue(_coreMessages: ModelMessage[], locale: Locale) {
  let i = _coreMessages.length - 1;
  while (i >= 0 && _coreMessages[i].role === "user") {
    i--;
  }
  const coreMessages = _coreMessages.slice(0, i + 1);
  const prologue =
    locale === "zh-CN"
      ? "请分析所有收集到的信息并开始构建用户画像。根据您观察到的帖子、评论和用户行为，创建3-5个不同的用户画像及其对应的AI代理系统提示。请记住使用savePersona函数将每个画像保存到数据库中。"
      : "Please analyze all the collected information and begin building user personas. Based on the posts, comments, and user behaviors you've observed, create 3-5 distinct user personas with their corresponding AI agent system prompts. Remember to use the savePersona function to save each persona to the database.";
  coreMessages.push({
    role: "user",
    content: [{ type: "text", text: prologue }],
  });
  return coreMessages;
}

export async function runBuildPersona({
  locale,
  statReport,
  abortSignal,
  logger,
  scoutUserChatId,
  streamWriter,
  noPersonaFallback,
}: {
  scoutUserChatId: number;
  streamWriter?: UIMessageStreamWriter;
  noPersonaFallback?: boolean;
} & AgentToolConfigArgs) {
  const stopController = new AbortController();
  const mergedAbortSignal = AbortSignal.any([abortSignal, stopController.signal]);

  const tools = {
    [ToolName.savePersona]: savePersonaTool({ scoutUserChatId }),
    [ToolName.toolCallError]: toolCallError,
  };

  const { coreMessages: _coreMessages } = await prepareMessagesForStreaming(scoutUserChatId, {
    tools: {
      ...tools,
      ...scoutChatTools(),
    },
  });
  const coreMessages = appendBuildPersonaPrologue(_coreMessages, locale);
  // set prompt cache checkpoint for bedrock claude 3.7 sonnet
  const lastAssistantMessage = coreMessages.findLast((message) => message.role === "assistant");
  if (lastAssistantMessage) {
    lastAssistantMessage.providerOptions = {
      bedrock: {
        cachePoint: { type: "default" },
      },
    };
  }

  const streamTextPromise = new Promise((resolve, reject) => {
    /**
     * 模型选择：
     * - 如果是一个个调用 savePersona，
     *   需要 maxSteps 调大，并且设置 parallel: false，模型只能用 claude，因为需要 cache
     *   但是不能太多 steps，虽然有 cache，savePersona 的 tool message 会被重复传给 llm
     * - 如果是批量调用 savePersona，目前支持最好的是 gemini-2.5-pro，但是这样太慢
     */
    // const reduceTokens = null as TReduceTokens;
    // const reduceTokens = { model: "gemini-2.5-pro", ratio: 2 } as TReduceTokens;
    const reduceTokens = noPersonaFallback
      ? (null as TReduceTokens)
      : ({ model: "gemini-2.5-flash", ratio: 10 } as TReduceTokens);
    const maxSteps = 5;
    const temperature = 0.5;
    /**
     * 给 gemini 2.5 flash 设置 toolChoice 时要注意:
     * gemini 不支持指定 tool 只能用 required
     * 但有个问题，如果 gemini 觉得只能保存 4 个 persona，这里用 required 会导致生成重复的，问题更大，
     * 所以索性就不强制 gemini 调用 tool，通过提示词控制它尽可能的生成人设，相应的，maxSteps 可以长一点
     */
    // const toolChoice = "required";
    // const toolChoice: ToolChoice<typeof tools> = { type: "tool", toolName: ToolName.savePersona };
    const toolChoice = "auto";
    const response = streamText({
      // claude-3-7-sonnet 目前会遇到 input tokens context 不够大的问题，但 gpt 4.1 mini 和 gemini 2.5 flash 没问题
      model: reduceTokens ? llm(reduceTokens.model) : llm("claude-3-7-sonnet"),

      providerOptions: defaultProviderOptions,

      system: buildPersonaSystem({
        locale,
        parallel: false, // gemini 可以开启, claude 不支持
      }),

      temperature,
      messages: coreMessages,
      tools,
      toolChoice,
      stopWhen: stepCountIs(maxSteps),

      // toolCallStreaming: true,  // gemini 这个会有问题，会出现所有字段值都是 placeholder
      // claude-3-7-sonnet 需要这个，savePersona 有时候会用 json 字符串作为参数
      experimental_repairToolCall: handleToolCallError,

      onChunk: async ({ chunk }) => {
        logger.debug({ chunk });
      },

      onStepFinish: async (step) => {
        const { tokens, extra } = calculateStepTokensUsage(step, { reduceTokens });
        const toolCalls = step.toolCalls.map((call) => call.toolName);
        logger.info({
          msg: "runBuildPersona streamText onStepFinish",
          toolCalls,
          usage: extra.usage,
          cache: extra.cache,
        });
        if (statReport) {
          const reportedBy = "buildPersona tool";
          const promises = [
            statReport("steps", toolCalls.length, { reportedBy, scoutUserChatId, toolCalls }),
            statReport("tokens", tokens, { reportedBy, scoutUserChatId, ...extra }),
          ];
          await Promise.all(promises);
        }

        // 限制 personas 数量
        if (
          (await prisma.persona.count({
            where: { scoutUserChatId },
          })) >= 5
        ) {
          logger.warn(`runBuildPersona streamText safely aborted: 5 personas limit reached`);
          // abort 会产生一条 error 的 stream 消息，下面的 streamWriter 会收到并在前端显示 error
          // 但是，作为 tool 调用的时候，这个没影响
          //   streamText 没有任何需要返回的信息
          //   savePersona 已经在 是进入 onStepFinish 之前成功执行了
          //   abort 了以后 streamTextPromise 会正常 resolve
          stopController.abort();
          // 下面没有监听 stopController.signal，只监听了 abortSignal，所以这里要单独 resolve
          resolve(null);
        }
      },

      onFinish: async ({ usage, providerMetadata }) => {
        const cache = providerMetadata?.bedrock?.usage;
        logger.info({ msg: "runBuildPersona streamText onFinish", usage, cache });
        resolve(null);
      },

      onError: ({ error }) => {
        if ((error as Error).name === "AbortError") {
          logger.warn(`runBuildPersona streamText aborted: ${(error as Error).message}`);
        } else {
          logger.error(`runBuildPersona streamText onError: ${(error as Error).message}`);
          reject(error);
        }
      },

      abortSignal: mergedAbortSignal,
    });
    if (streamWriter) {
      streamWriter.merge(
        response.toUIMessageStream({
          // generateMessageId: () => streamingMessage.id,  // 需要 streamWriter 的那个测试页面，不需要保存消息，这里不需要设置
        }),
      );
    }
    // 这里没有监听 stopController.signal，只监听了 abortSignal，只有 abortSignal abort 了才是 reject
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
