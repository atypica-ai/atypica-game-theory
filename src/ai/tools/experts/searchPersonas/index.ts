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
  locale,
  statReport,
  // studyLog,
}: {
  locale: Locale;
  statReport: StatReporter;
  studyLog: Logger;
}) =>
  tool({
    description:
      "Search existing user persona database using semantic similarity matching to find relevant user profiles that match research criteria",
    parameters: z.object({
      searchQueries: z
        .array(z.string().max(300))
        .min(2)
        .max(3)
        .describe(
          "Detailed descriptions of target user profiles to find. Each description should be specific and comprehensive, describing user characteristics, demographics, interests, behaviors, goals, and context. The more detailed and specific, the better the search results (provide 2-3 diverse detailed descriptions)",
        ),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ searchQueries }): Promise<SearchPersonasToolResult> => {
      const searchResults = await Promise.all(
        searchQueries.map((searchQuery) => searchPersonas(locale, searchQuery)),
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

async function searchPersonas(locale: Locale, searchQuery: string) {
  const embedding = await createTextEmbedding(searchQuery, "retrieval.query");
  const personas = await prisma.$queryRaw<TPersonaForStudy[]>`
      SELECT
        "id" as "personaId",
        "name",
        "source",
        "tags"
      FROM "Persona"
      WHERE "embedding" <=> ${JSON.stringify(embedding)}::vector < 0.9 AND locale = ${locale}
      ORDER BY "embedding" <=> ${JSON.stringify(embedding)}::vector ASC
      LIMIT 5
    `;
  return { searchQuery, personas };
}
