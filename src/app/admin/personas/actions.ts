"use server";

import { createTextEmbedding } from "@/ai/embedding";
import authOptions from "@/app/(auth)/authOptions";
import { scorePersona } from "@/app/(persona)/lib";
import { checkAdminAuth } from "@/app/admin/actions";
import { ServerActionResult } from "@/lib/serverAction";
import { Persona } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { forbidden } from "next/navigation";
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

/**
 * 管理员可以访问 tier 0,1,2,3 (所有personas)
 * 普通用户可以访问 tier 1,2 (高质量的), 目前 tier3 的还不支持
 */
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
  let userId: number;
  let tiers: number[];
  try {
    const user = await checkAdminAuth([AdminPermission.MANAGE_PERSONAS]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userId = user.id;
    tiers = [0, 1, 2, 3];
  } catch {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      forbidden();
    }
    tiers = [1, 2];
  }

  locale = locale || (await getLocale());
  const skip = (page - 1) * pageSize;

  // If there's a search query, use vector search, and ignore scoutUserChatId query
  if (searchQuery && searchQuery.trim()) {
    try {
      const embedding = await createTextEmbedding(searchQuery, "retrieval.query");
      const personas = await prisma.$queryRaw<TPersona[]>`
        SELECT id, name, source, prompt, tags, tier
        FROM "Persona"
        WHERE "embedding" <=> ${JSON.stringify(embedding)}::vector < 0.9 AND locale = ${locale} AND tier = ANY(${tiers})
        ORDER BY "embedding" <=> ${JSON.stringify(embedding)}::vector ASC
        LIMIT ${pageSize}
        OFFSET ${skip}
      `;
      const totalCountResult = await prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*) as count
        FROM "Persona"
        WHERE "embedding" <=> ${JSON.stringify(embedding)}::vector < 0.5 AND locale = ${locale} AND tier = ANY(${tiers})
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

  const where = scoutUserChatId
    ? {
        scoutUserChatId,
        locale,
      }
    : {
        tier: { in: tiers },
        locale,
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
