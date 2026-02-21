import "server-only";

import { createTextEmbedding } from "@/ai/embedding";
import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import { recordPersonaPanelContext } from "@/app/(study)/context/utils";
import { prismaRO } from "@/prisma/prisma";
import { searchPersonas as searchPersonasFromMeili } from "@/search/lib/queries";
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
  userChatId,
  locale,
  statReport,
  logger,
}: AgentToolConfigArgs & {
  userId: number;
  userChatId: number;
}) =>
  tool({
    description:
      "Search existing user persona database using semantic similarity matching to find relevant user profiles that match research criteria",
    inputSchema: searchPersonasInputSchema,
    outputSchema: searchPersonasOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async ({ searchQueries, usePrivatePersonas }): Promise<SearchPersonasToolResult> => {
      // 1. Search: Meilisearch first, fallback to embedding if empty
      const searchResultsSettled = await Promise.allSettled(
        searchQueries.map(async (searchQuery) => {
          const params = { locale, searchQuery, logger, userId, usePrivatePersonas };
          let personaIds = await searchPersonaIdsByMeili({ ...params });
          if (personaIds.length === 0) {
            logger.info({
              msg: "Meilisearch returned empty, falling back to embedding",
              searchQuery,
            });
            personaIds = await searchPersonaIdsByEmbedding({ ...params });
          }
          return personaIds;
        }),
      );
      const searchResults = searchResultsSettled
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);
      // 2. Deduplicate with round-robin merge
      const allPersonaIds: number[] = [];
      const seenIds = new Set<number>();
      const maxLen = Math.max(...searchResults.map((r) => r.length), 0);
      for (let i = 0; i < maxLen; i++) {
        for (const result of searchResults) {
          if (i < result.length && !seenIds.has(result[i])) {
            allPersonaIds.push(result[i]);
            seenIds.add(result[i]);
          }
        }
      }
      const finalIds = allPersonaIds.slice(0, 10);

      if (finalIds.length === 0) {
        return { personas: [], plainText: "No personas found" };
      }

      // 3. Fetch persona details and maintain search order
      const dbPersonas = await prismaRO.persona.findMany({
        where: { id: { in: finalIds } },
        select: { id: true, name: true, source: true, tags: true },
      });
      const personaMap = new Map(dbPersonas.map((p) => [p.id, p]));
      const personas: TPersonaForStudy[] = finalIds
        .map((id) => personaMap.get(id))
        .filter((p) => p !== undefined)
        .map((p) => ({
          personaId: p.id,
          name: p.name,
          source: p.source,
          tags: p.tags as string[],
        }));

      // 4. Stats & context recording
      if (statReport) {
        await statReport("personas", personas.length, {
          reportedBy: "searchPersonas tool",
          personaIds: personas.map((p) => p.personaId),
        });
      }
      await recordPersonaPanelContext({
        userId,
        userChatId,
        personaIds: personas.map((p) => p.personaId),
        instruction: searchQueries.join("\n"),
      });

      return {
        personas,
        plainText: `${personas.length} personas found: ${JSON.stringify(personas)}`,
      };
    },
  });

async function searchPersonaIdsByMeili({
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
}): Promise<number[]> {
  try {
    const searchResults = usePrivatePersonas
      ? await searchPersonasFromMeili({
          query: searchQuery,
          userId,
          pageSize: 5,
        })
      : await searchPersonasFromMeili({
          query: searchQuery,
          tiers: [1, 2],
          locales: [locale],
          pageSize: 5,
        });

    return searchResults.hits
      .map((hit) => {
        const match = hit.slug.match(/^persona-(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((id) => id > 0);
  } catch (error) {
    logger.error({
      msg: `Error searching personas via Meilisearch`,
      searchQuery,
      error: String(error),
    });
    return [];
  }
}

async function searchPersonaIdsByEmbedding({
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
}): Promise<number[]> {
  try {
    const embedding = await createTextEmbedding(searchQuery, "retrieval.query");

    const rows = usePrivatePersonas
      ? await prismaRO.$queryRaw<{ id: number }[]>`
          SELECT "id"
          FROM "Persona"
          WHERE "embedding" <=> ${JSON.stringify(embedding)}::halfvec < 0.9
            AND id = ANY(
              SELECT p."id" FROM "Persona" p
              JOIN "PersonaImport" pi ON pi."id" = p."personaImportId"
              WHERE pi."userId" = ${userId}
            )
          ORDER BY "embedding" <=> ${JSON.stringify(embedding)}::halfvec ASC
          LIMIT 5
        `
      : await prismaRO.$queryRaw<{ id: number }[]>`
          SELECT "id"
          FROM "Persona"
          WHERE "embedding" <=> ${JSON.stringify(embedding)}::halfvec < 0.9
            AND locale = ${locale}
            AND tier IN (1, 2)
          ORDER BY "embedding" <=> ${JSON.stringify(embedding)}::halfvec ASC
          LIMIT 5
        `;

    return rows.map((r) => r.id);
  } catch (error) {
    logger.error({
      msg: `Error searching personas via embedding`,
      searchQuery,
      error: String(error),
    });
    return [];
  }
}
