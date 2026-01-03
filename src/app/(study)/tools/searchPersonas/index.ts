import "server-only";

import { createTextEmbedding } from "@/ai/embedding";
import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import { prisma } from "@/prisma/prisma";
import { tool } from "ai";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { TPersonaForStudy } from "../buildPersona/types";
import {
  searchPersonasInputSchema,
  searchPersonasOutputSchema,
  type SearchPersonasToolResult,
} from "./types";

export const searchPersonasTool = ({
  userId,
  locale,
  statReport,
  logger,
}: AgentToolConfigArgs & { userId: number }) =>
  tool({
    description:
      "Search existing user persona database using semantic similarity matching to find relevant user profiles that match research criteria",
    inputSchema: searchPersonasInputSchema,
    outputSchema: searchPersonasOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async ({ searchQueries, usePrivatePersonas }): Promise<SearchPersonasToolResult> => {
      const searchResults = await Promise.all(
        searchQueries.map((searchQuery) =>
          searchPersonas({ locale, searchQuery, logger, userId, usePrivatePersonas }),
        ),
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

async function searchPersonas({
  locale,
  searchQuery,
  logger,
  userId,
  usePrivatePersonas,
}: {
  locale: Locale;
  searchQuery: string;
  logger: Logger;
  userId: number;
  usePrivatePersonas: boolean;
}) {
  try {
    const embedding = await createTextEmbedding(searchQuery, "retrieval.query");
    let personas = [] as TPersonaForStudy[];
    if (usePrivatePersonas) {
      const personaIds = (
        await prisma.persona.findMany({
          where: { personaImport: { userId } },
          select: { id: true },
        })
      ).map(({ id }) => id);
      console.log(personaIds);
      personas = await prisma.$queryRaw<TPersonaForStudy[]>`
SELECT
  "id" as "personaId",
  "name",
  "source",
  "tags"
FROM "Persona"
WHERE "embedding" <=> ${JSON.stringify(embedding)}::halfvec < 0.9
  AND id = ANY(${personaIds})
ORDER BY "embedding" <=> ${JSON.stringify(embedding)}::halfvec ASC
LIMIT 5
`;
    } else {
      personas = await prisma.$queryRaw<TPersonaForStudy[]>`
SELECT
  "id" as "personaId",
  "name",
  "source",
  "tags"
FROM "Persona"
WHERE "embedding" <=> ${JSON.stringify(embedding)}::halfvec < 0.9
  AND locale = ${locale}
  AND tier in (1, 2)
ORDER BY "embedding" <=> ${JSON.stringify(embedding)}::halfvec ASC
LIMIT 5
`;
    }
    return { searchQuery, personas };
  } catch (error) {
    logger.error(`Error searching personas with query "${searchQuery}": ${error}`);
    return { searchQuery, personas: [] };
  }
}
