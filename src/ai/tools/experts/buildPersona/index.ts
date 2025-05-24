import "server-only";

import { convertStepsToAIMessage, prepareMessagesForStreaming } from "@/ai/messageUtils";
import { buildPersonaSystem } from "@/ai/prompt";
import { llm, LLMModelName, providerOptions } from "@/ai/provider";
import { savePersonaTool } from "@/ai/tools/tools";
import { PlainTextToolResult, StatReporter, ToolName } from "@/ai/tools/types";
import { prisma } from "@/prisma/prisma";
import { DataStreamWriter, Message, streamText, tool } from "ai";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { z } from "zod";
import { BuildPersonaToolResult } from "./types";

const REDUCE_TOKENS: {
  model: LLMModelName;
  ratio: number;
} = {
  model: "gemini-2.5-pro",
  ratio: 2,
};

export const buildPersonaTool = ({
  userId,
  locale,
  abortSignal,
  statReport,
  studyLog,
}: {
  userId: number;
  locale: Locale;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  studyLog: Logger;
}) =>
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
      try {
        await runBuildPersona({
          locale,
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
  locale,
  scoutUserChatId,
  statReport,
  abortSignal,
  studyLog,
  streamWriter,
}: {
  locale: Locale;
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
      system: buildPersonaSystem({ locale }),
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
        studyLog.info({
          msg: "Persona building step completed",
          stepType: step.stepType,
          toolCalls,
          usage,
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
            promises.push(statReport("tokens", tokens, extra));
          }
          await Promise.all(promises);
        }
      },
      onFinish: async ({ steps, usage }) => {
        studyLog.info({ msg: "Persona building stream completed", usage });
        const message = convertStepsToAIMessage(steps);
        resolve(message);
      },
      onError: ({ error }) => {
        studyLog.error(`Persona building stream error: ${(error as Error).message}`);
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
    studyLog.info(`Persona building stream complete: ${message.content.substring(0, 20)}`);
  } catch (error) {
    const errMsg = (error as Error).message;
    studyLog.error(`Persona building stream error: ${errMsg}`);
    throw error;
  }
}
