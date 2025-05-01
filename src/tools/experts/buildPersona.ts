import { llm, providerOptions } from "@/lib/llm";
import { CONTINUE_ASSISTANT_STEPS, prepareMessagesForStreaming } from "@/lib/messageUtils";
import { prisma } from "@/lib/prisma";
import { fixMalformedUnicodeString } from "@/lib/utils";
import { buildPersonaSystem } from "@/prompt";
import { streamObject, tool } from "ai";
import { Logger } from "pino";
import { z } from "zod";
import { StatReporter } from "..";
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
      const response = await runBuildPersona({
        scoutUserChatId,
        abortSignal,
        statReport,
        studyLog,
      });
      const object = await response.object;
      const personas: BuildPersonaToolResult["personas"] = [];
      // for (const [key, data] of Object.entries(object)) {
      //   studyLog.info(`Persona ${key} generated, ${data.name}`);
      for (const data of object) {
        studyLog.info(`Persona generated, ${data.name}`);
        if (data.personaPrompt.length < 20) {
          continue; // 如果字太少，忽略
        }
        try {
          const { name, source, tags, personaPrompt: prompt } = data;
          const persona = await prisma.persona.create({
            data: { name, source, tags, prompt, samples: [], scoutUserChatId },
          });
          personas.push({ personaId: persona.id, name, tags, source });
        } catch (error) {
          studyLog.error(`Failed to create persona ${JSON.stringify(data)}: ${error}`);
        }
      }
      if (personas.length === 0) {
        studyLog.error("No personas found");
        throw new Error("No personas found");
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
}: {
  scoutUserChatId: number;
  statReport: StatReporter;
  abortSignal: AbortSignal;
  studyLog: Logger;
}) {
  const { coreMessages } = await prepareMessagesForStreaming(scoutUserChatId);
  let messages = coreMessages.filter(
    (message) => !(message.role === "user" && message.content === CONTINUE_ASSISTANT_STEPS),
  );
  if (messages.length && messages[messages.length - 1].role === "user") {
    messages = messages.slice(0, -1);
  }
  messages.push({
    role: "user",
    content: "build personas",
  });
  // const schema = z.object({
  //   persona1: personaBuildSchema(),
  //   persona2: personaBuildSchema(),
  //   persona3: personaBuildSchema(),
  //   persona4: personaBuildSchema(),
  //   persona5: personaBuildSchema(),
  //   persona6: personaBuildSchema(),
  // });
  const response = streamObject({
    model: llm("gemini-2.5-pro"),
    // model: llm("gpt-4o"), // gpt 可以对一个字段的值进行 stream，这样在 prompt 生成部分的时候就可以看到结果，比较快
    // temperature: 0,
    providerOptions: providerOptions,
    system: buildPersonaSystem(),
    messages,
    output: "array",
    schema: personaBuildSchema(),
    // schema,
    onFinish: async (result) => {
      studyLog.info({
        msg: "streamObject Finished",
        // object: result.object,
        usage: result.usage,
      });
      if (result.usage.totalTokens > 0 && statReport) {
        await statReport("tokens", result.usage.totalTokens, {
          reportedBy: "buildPersona tool",
          scoutUserChatId,
        });
      }
    },
    abortSignal,
  });
  return response;
}

export const personaBuildSchema = () =>
  z.object({
    name: z.string().describe("名字，不要包含姓氏，使用网名").transform(fixMalformedUnicodeString),
    source: z.string().describe("数据来源").transform(fixMalformedUnicodeString),
    // userids: z.array(z.string()).optional().describe("该人设典型的用户 ID 列表").default([]),
    tags: z
      .array(z.string())
      .describe("用户标签，3-5个特征标签")
      .transform((tags) => tags.map((tag) => fixMalformedUnicodeString(tag))),
    personaPrompt: z
      .string()
      .describe("模拟用户画像的智能体的系统提示词，300到500字")
      .transform(fixMalformedUnicodeString),
  });
