import { prisma } from "@/lib/prisma";
import { fixMalformedUnicodeString } from "@/lib/utils";
import { StatReporter } from "@/tools";
import { tool } from "ai";
import { z } from "zod";
import { PlainTextToolResult } from "../utils";

export interface SavePersonaToolResult extends PlainTextToolResult {
  personaId: number;
  name: string;
  tags: string[];
  prompt: string;
  plainText: string;
}

export const savePersonaTool = ({
  scoutUserChatId,
  statReport,
}: {
  scoutUserChatId: number;
  statReport?: StatReporter;
}) =>
  tool({
    description: "将生成的完整用户画像保存到数据库（确保 personaPrompt 信息完整）",
    parameters: z.object({
      name: z
        .string()
        .describe("名字，不要包含姓氏，使用网名")
        .transform(fixMalformedUnicodeString),
      source: z.string().describe("数据来源").transform(fixMalformedUnicodeString),
      tags: z
        .array(z.string())
        .describe("相关标签")
        .transform((tags) => tags.map((tag) => fixMalformedUnicodeString(tag))),
      // userids: z.array(z.string()).optional().describe("该人设典型的用户 ID 列表").default([]),
      personaPrompt: z
        .string()
        .describe("用户画像（persona）的系统提示词")
        .transform(fixMalformedUnicodeString),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({
      name,
      source,
      tags,
      // userids: samples,
      personaPrompt: prompt,
    }): Promise<SavePersonaToolResult> => {
      const samples = [] as string[];
      const persona = await prisma.persona.create({
        data: { name, source, tags, samples, prompt, scoutUserChatId },
      });
      const result = {
        personaId: persona.id,
        name: persona.name,
        tags: persona.tags as string[],
        prompt: persona.prompt,
      };
      if (statReport) {
        await statReport("personas", 1, {
          reportedBy: "savePersona tool",
          scoutUserChatId,
          personaId: persona.id,
        });
      }
      return {
        ...result,
        plainText: JSON.stringify(result),
      };
    },
  });

export interface BatchSavePersonasToolResult extends PlainTextToolResult {
  personas: {
    personaId: number;
    name: string;
    tags: string[];
    prompt: string;
  }[];
  plainText: string;
}

export const batchSavePersonasTool = ({
  scoutUserChatId,
  statReport,
}: {
  scoutUserChatId: number;
  statReport?: StatReporter;
}) =>
  tool({
    description: "将生成的完整用户画像批量保存到数据库（确保 personaPrompt 信息完整）",
    parameters: z.object({
      personas: z.array(
        z
          .object({
            name: z
              .string()
              .describe("名字，不要包含姓氏，使用网名")
              .transform(fixMalformedUnicodeString),
            source: z.string().describe("数据来源").transform(fixMalformedUnicodeString),
            tags: z
              .array(z.string())
              .describe("相关标签")
              .transform((tags) => tags.map((tag) => fixMalformedUnicodeString(tag))),
            // userids: z.array(z.string()).optional().describe("该人设典型的用户 ID 列表").default([]),
            personaPrompt: z
              .string()
              .describe("用户画像（persona）的系统提示词")
              .transform(fixMalformedUnicodeString),
          })
          .describe("用户画像列表"),
      ),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ personas }): Promise<BatchSavePersonasToolResult> => {
      const result: BatchSavePersonasToolResult["personas"] = [];
      for (const { name, source, tags, personaPrompt: prompt } of personas) {
        const samples = [] as string[];
        const persona = await prisma.persona.create({
          data: { name, source, tags, samples, prompt, scoutUserChatId },
        });
        result.push({
          personaId: persona.id,
          name: persona.name,
          tags: persona.tags as string[],
          prompt: persona.prompt,
        });
        if (statReport) {
          await statReport("personas", 1, {
            reportedBy: "savePersona tool",
            scoutUserChatId,
            personaId: persona.id,
          });
        }
      }
      return {
        personas: result,
        plainText: JSON.stringify(result),
      };
    },
  });
