"use server";

import { createTextEmbedding } from "@/ai/embedding";
import { scorePersona } from "@/app/(persona)/lib";
import { checkAdminAuth } from "@/app/admin/actions";
import { ServerActionResult } from "@/lib/serverAction";
import { Persona } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { AdminPermission } from "../types";

type TPersona = Pick<Persona, "id" | "name" | "source" | "prompt" | "tier"> & { tags: string[] };

export async function rescorePersona(personaId: number): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_PERSONAS]);

  const persona = await prisma.persona.findUniqueOrThrow({
    where: { id: personaId },
  });

  await scorePersona(persona);

  return {
    success: true,
    data: undefined,
  };
}

type TPersonaWithImport = TPersona & {
  personaImport?: {
    id: number;
    analysis: unknown;
    extra: unknown;
    createdAt: Date;
    user?: {
      email: string;
    };
  } | null;
};

/**
 * Admin-only fetchPersonas with tier and locale filtering
 */
export async function fetchPersonas({
  locales,
  tiers,
  scoutUserChatId,
  searchQuery,
  page = 1,
  pageSize = 12,
}: {
  locales?: string[];
  tiers?: number[];
  scoutUserChatId?: number;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<ServerActionResult<TPersonaWithImport[]>> {
  // Ensure only admins can access this function
  await checkAdminAuth([AdminPermission.MANAGE_PERSONAS]);

  // Default values for admin access
  const selectedTiers = tiers || [0, 1, 2, 3];
  const selectedLocales = locales || ["zh-CN", "en-US"];

  const skip = (page - 1) * pageSize;

  // If there's a search query, use vector search, and ignore scoutUserChatId query
  if (searchQuery && searchQuery.trim()) {
    try {
      const embedding = await createTextEmbedding(searchQuery, "retrieval.query");
      const personas = await prisma.$queryRaw<TPersonaWithImport[]>`
        SELECT
          p.id, p.name, p.source, p.prompt, p.tags, p.tier, p.locale,
          pi.id as "personaImportId",
          pi.analysis as "personaImportAnalysis",
          pi.extra as "personaImportExtra",
          pi."createdAt" as "personaImportCreatedAt",
          u.email as "personaImportUserEmail"
        FROM "Persona" p
        LEFT JOIN "PersonaImport" pi ON p."personaImportId" = pi.id
        LEFT JOIN "User" u ON pi."userId" = u.id
        WHERE p."embedding" <=> ${JSON.stringify(embedding)}::vector < 0.9
          AND p.locale = ANY(${selectedLocales})
          AND p.tier = ANY(${selectedTiers})
        ORDER BY p."embedding" <=> ${JSON.stringify(embedding)}::vector ASC
        LIMIT ${pageSize}
        OFFSET ${skip}
      `;
      const totalCountResult = await prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*) as count
        FROM "Persona" p
        WHERE p."embedding" <=> ${JSON.stringify(embedding)}::vector < 0.9
          AND p.locale = ANY(${selectedLocales})
          AND p.tier = ANY(${selectedTiers})
      `;
      const totalCount = Math.min(40, Number(totalCountResult[0].count));
      return {
        success: true,
        data: personas.map((row: Record<string, unknown>) => ({
          id: row.id as number,
          name: row.name as string,
          source: row.source as string,
          prompt: row.prompt as string,
          tags: row.tags as string[],
          tier: row.tier as number,
          personaImport: row.personaImportId
            ? {
                id: row.personaImportId as number,
                analysis: row.personaImportAnalysis,
                extra: row.personaImportExtra,
                createdAt: row.personaImportCreatedAt as Date,
                user: row.personaImportUserEmail
                  ? { email: row.personaImportUserEmail as string }
                  : undefined,
              }
            : null,
        })),
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      };
    } catch (error) {
      console.log(`Vector search error: ${(error as Error).message}`);
      return {
        success: false,
        message: "Persona search error",
      };
    }
  }

  const where = scoutUserChatId
    ? {
        scoutUserChatId,
        locale: { in: selectedLocales },
      }
    : {
        tier: { in: selectedTiers },
        locale: { in: selectedLocales },
      };

  // Regular search (no query or fallback from vector search error)
  const [personas, totalCount] = await Promise.all([
    prisma.persona.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        source: true,
        prompt: true,
        tags: true,
        tier: true,
        personaImport: {
          select: {
            id: true,
            analysis: true,
            extra: true,
            createdAt: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
      skip,
      take: pageSize,
    }),
    prisma.persona.count({ where }),
  ]);

  return {
    success: true,
    data: personas.map((persona) => ({
      ...persona,
      tags: persona.tags as string[],
      personaImport: persona.personaImport ? {
        ...persona.personaImport,
        analysis: persona.personaImport.analysis,
        extra: persona.personaImport.extra,
        user: persona.personaImport.user?.email ? { email: persona.personaImport.user.email } : undefined,
      } : null,
    })),
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}
