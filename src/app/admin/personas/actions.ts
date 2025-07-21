"use server";

import { createTextEmbedding } from "@/ai/embedding";
import { scorePersona } from "@/app/(persona)/lib";
import { checkAdminAuth } from "@/app/admin/actions";
import { ServerActionResult } from "@/lib/serverAction";
import { Persona } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
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

export async function fetchPersonas({
  locale,
  scoutUserChatId,
  searchQuery,
  page = 1,
  pageSize = 12,
}: {
  locale?: Locale;
  scoutUserChatId?: number;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<ServerActionResult<TPersona[]>> {
  await checkAdminAuth([AdminPermission.MANAGE_PERSONAS]);

  locale = locale || (await getLocale());
  const skip = (page - 1) * pageSize;

  // If there's a search query, use vector search, and ignore scoutUserChatId query
  if (searchQuery && searchQuery.trim()) {
    try {
      const embedding = await createTextEmbedding(searchQuery, "retrieval.query");
      const personas = await prisma.$queryRaw<TPersona[]>`
        SELECT id, name, source, prompt, tags, tier
        FROM "Persona"
        WHERE "embedding" <=> ${JSON.stringify(embedding)}::vector < 0.9 AND locale = ${locale}
        ORDER BY "embedding" <=> ${JSON.stringify(embedding)}::vector ASC
        LIMIT ${pageSize}
        OFFSET ${skip}
      `;
      const totalCountResult = await prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*) as count
        FROM "Persona"
        WHERE "embedding" <=> ${JSON.stringify(embedding)}::vector < 0.5 AND locale = ${locale}
      `;
      // 向量搜索的结果现在看起来最多就是 40，这个应该是索引的设置
      const totalCount = Math.min(40, Number(totalCountResult[0].count));
      return {
        success: true,
        data: personas.map((persona) => {
          return {
            ...persona,
            tags: persona.tags as string[],
          };
        }),
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

  const where = scoutUserChatId ? { scoutUserChatId, locale } : { locale };
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
      },
      skip,
      take: pageSize,
    }),
    prisma.persona.count({ where }),
  ]);

  return {
    success: true,
    data: personas.map((persona) => {
      return {
        ...persona,
        tags: persona.tags as string[],
      };
    }),
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}
