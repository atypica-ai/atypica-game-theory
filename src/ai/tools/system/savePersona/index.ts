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
    description:
      "Save a detailed user persona and its corresponding AI agent system prompt to the database for future interview simulations",
    parameters: z.object({
      name: z
        .string()
        .describe(
          "User persona display name or nickname (avoid family names for privacy reasons), keep it under 5 words",
        )
        // .max(100) // 英文环境下，gemini 对这个 100 的理解不是 100 个字符，这里先去掉
        .transform(fixMalformedUnicodeString),
      source: z
        .string()
        .describe("Source or platform where persona characteristics were observed (10 words max)")
        // .max(100) // 英文环境下，gemini 对这个 100 的理解不是 100 个字符，这里先去掉
        .transform(fixMalformedUnicodeString),
      tags: z
        .array(z.string())
        .describe(
          "3-5 characteristic tags that define this persona's key traits, interests, or demographics",
        )
        .transform((tags) => tags.map((tag) => fixMalformedUnicodeString(tag))),
      // userids: z.array(z.string()).optional().describe("该人设典型的用户 ID 列表").default([]),
      personaPrompt: z
        .string()
        // .max(2000) // 英文环境下，gemini 对这个 100 的理解不是 100 个字符，这里先去掉
        .describe(
          "Comprehensive AI agent system prompt that enables realistic simulation of this persona's thinking patterns, decision-making, and communication style (300-500 words)",
        )
        .transform(fixMalformedUnicodeString),
      locale: z
        .enum(["zh-CN", "en-US"])
        .optional()
        .describe(
          "Language used in the text parameters (name, personaPrompt, tags, etc.). Use 'zh-CN' for Chinese content, 'en-US' for English content. Do not provide a value if there is no matching option",
        ),
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
      locale,
    }): Promise<SavePersonaToolResult> => {
      const samples = [] as string[];
      const persona = await prisma.persona.create({
        data: {
          name: name.slice(0, 50),
          source: source.slice(0, 200), // 为了数据库不报错，防御性的截断一下
          tags: tags.map((tag) => tag.slice(0, 50)),
          samples,
          prompt,
          locale,
          scoutUserChatId,
        },
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
        plainText: `User persona "${name}" saved successfully with ID: ${persona.id}`,
      };
    },
  });

async function createPersonaEmbedding(persona: Persona) {
  try {
    // const text = persona.name + " " + (persona.tags as string[])?.join(" ");
    const text = persona.prompt; // 使用 prompt 进行更精确的搜索
    const embedding = await createTextEmbedding(text, "retrieval.passage");
    await prisma.$executeRaw`
      UPDATE "Persona"
      SET "embedding" = ${JSON.stringify(embedding)}::vector
      WHERE "id" = ${persona.id}
    `;
    console.log(`Updated semantic embedding for persona ${persona.id}`);
  } catch (error) {
    console.error(
      `Failed to update semantic embedding for persona ${persona.id}: ${(error as Error).message}`,
    );
  }
}
