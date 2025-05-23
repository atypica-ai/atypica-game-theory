import "server-only";

import { createTextEmbedding } from "@/ai/embedding";
import { PlainTextToolResult, StatReporter, TPersonaForStudy } from "@/ai/tools/types";
import { prisma } from "@/prisma/prisma";
import { tool } from "ai";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { z } from "zod";
import { type SearchPersonasToolResult } from "./types";

export const searchPersonasTool = ({
  // locale, // TODO: 根据语言搜索 persona
  statReport,
  // studyLog,
}: {
  locale: Locale;
  statReport: StatReporter;
  studyLog: Logger;
}) =>
  tool({
    description: "根据语义相似度搜索与查询条件匹配的用户智能体画像",
    parameters: z.object({
      searchQueries: z
        .array(z.string().max(100))
        .min(1)
        .max(5)
        .describe("搜索用户画像的关键词或短语，可提供1-5个"),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ searchQueries }): Promise<SearchPersonasToolResult> => {
      const searchResults = await Promise.all(
        searchQueries.map((searchQuery) => searchPersonas(searchQuery)),
      );
      let personas: TPersonaForStudy[] = [];
      const seenPersonaIds = new Set<number>();
      const maxPersonaLength = Math.max(...searchResults.map((result) => result.personas.length));
      for (let i = 0; i < maxPersonaLength; i++) {
        searchResults.forEach((result) => {
          if (i >= result.personas.length) {
            return;
          }
          const persona = result.personas[i];
          if (!seenPersonaIds.has(persona.personaId)) {
            personas.push(persona);
            seenPersonaIds.add(persona.personaId);
          }
        });
      }
      personas = personas.slice(0, 10); // 取前10个
      if (!personas.length) {
        return {
          personas,
          plainText: "No personas found",
        };
      }
      if (statReport) {
        await statReport("personas", personas.length, {
          reportedBy: "searchPersonas tool",
          personaIds: personas.map((persona) => persona.personaId),
        });
      }
      return {
        personas,
        plainText: `${personas.length} personas found: ${JSON.stringify(personas)}`,
      };
    },
  });

async function searchPersonas(searchQuery: string) {
  const embedding = await createTextEmbedding(searchQuery);
  const personas = await prisma.$queryRaw<TPersonaForStudy[]>`
      SELECT
        "id" as "personaId",
        "name",
        "source",
        "tags"
      FROM "Persona"
      WHERE "embedding" <=> ${JSON.stringify(embedding)}::vector < 0.5
      ORDER BY "embedding" <=> ${JSON.stringify(embedding)}::vector ASC
      LIMIT 5
    `;
  return { searchQuery, personas };
}
