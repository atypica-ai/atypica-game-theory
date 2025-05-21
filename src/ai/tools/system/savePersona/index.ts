import { createTextEmbedding } from "@/ai/embedding";
import { PlainTextToolResult, StatReporter } from "@/ai/tools/types";
import { fixMalformedUnicodeString } from "@/lib/utils";
import { Persona } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { tool } from "ai";
import { z } from "zod";

export interface SavePersonaToolResult extends PlainTextToolResult {
  personaId: number;
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
        .max(100)
        .transform(fixMalformedUnicodeString),
      source: z.string().describe("数据来源").max(100).transform(fixMalformedUnicodeString),
      tags: z
        .array(z.string().max(50))
        .describe("用户标签")
        .transform((tags) => tags.map((tag) => fixMalformedUnicodeString(tag))),
      // userids: z.array(z.string()).optional().describe("该人设典型的用户 ID 列表").default([]),
      personaPrompt: z
        .string()
        .max(2000)
        .describe("智能体的系统提示词，详细描述用户画像，300到500字")
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
      waitUntil(createPersonaEmbedding(persona));
      if (statReport) {
        await statReport("personas", 1, {
          reportedBy: "savePersona tool",
          scoutUserChatId,
          personaId: persona.id,
        });
      }
      return {
        personaId: persona.id,
        plainText: `Persona saved successfully with ID: ${persona.id}`,
      };
    },
  });

async function createPersonaEmbedding(persona: Persona) {
  try {
    const text = persona.name + " " + (persona.tags as string[])?.join(" ");
    // const text = persona.prompt;
    const embedding = await createTextEmbedding(text);
    await prisma.$executeRaw`
      UPDATE "Persona"
      SET "embedding" = ${JSON.stringify(embedding)}::vector
      WHERE "id" = ${persona.id}
    `;
    console.log(`Updated embedding for persona ${persona.id}`);
  } catch (error) {
    console.error(
      `Failed to update embedding for persona ${persona.id}: ${(error as Error).message}`,
    );
  }
}
