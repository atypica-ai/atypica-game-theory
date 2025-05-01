import { llm, providerOptions } from "@/lib/llm";
import { convertStepsToAIMessage, prepareMessagesForStreaming } from "@/lib/messageUtils";
import { prisma } from "@/lib/prisma";
import { buildPersonaSystem } from "@/prompt";
import { DataStreamWriter, Message, streamText, tool } from "ai";
import { Logger } from "pino";
import { z } from "zod";
import { savePersonaTool, StatReporter, ToolName } from "..";
import { PlainTextToolResult } from "../utils";

export interface BuildPersonaToolResult extends PlainTextToolResult {
  personas: {
    personaId: number;
    name: string;
    tags: string[];
    source: string;
  }[];
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
    description: "基于用户画像搜索（scoutTaskChat）的信息总结并构建智能体",
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
    const response = streamText({
      model: llm("gemini-2.5-pro"),
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
      // onChunk: async (chunk) => {
      //   console.log(chunk);
      // },
      onStepFinish: async (step) => {
        studyLog.info({
          msg: "Step finished",
          stepType: step.stepType,
          toolCalls: step.toolCalls.map((call) => call.toolName),
          usage: step.usage,
        });
        if (step.usage.totalTokens > 0 && statReport) {
          await statReport("tokens", step.usage.totalTokens, {
            reportedBy: "buildPersona tool",
            scoutUserChatId,
          });
        }
      },
      onFinish: async ({ steps, usage }) => {
        const message = convertStepsToAIMessage(steps);
        resolve(message);
        studyLog.info({
          msg: "buildPersona Finished",
          usage: usage,
        });
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
