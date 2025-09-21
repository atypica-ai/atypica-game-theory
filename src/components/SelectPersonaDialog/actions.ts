"use server";
import { createTextEmbedding } from "@/ai/embedding";
import authOptions from "@/app/(auth)/authOptions";
import { ServerActionResult } from "@/lib/serverAction";
import { Persona } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { forbidden } from "next/navigation";

type TPersona = Pick<Persona, "id" | "name" | "source" | "prompt" | "tier"> & { tags: string[] };

export async function fetchPersonas({
  locale,
  searchQuery,
  page = 1,
  pageSize = 12,
  mode = "public",
}: {
  locale?: Locale;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
  mode?: "public" | "private";
} = {}): Promise<ServerActionResult<TPersona[]>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    forbidden();
  }

  locale = locale || (await getLocale());
  const skip = (page - 1) * pageSize;

  if (mode === "private") {
    // Private mode: tier 3, user-created personas, no search
    const where = {
      tier: { in: [3] },
      locale,
      personaImport: {
        userId: session.user.id,
      },
    };

    const [personas, totalCount] = await Promise.all([
      prisma.persona.findMany({
        where,
        orderBy: {
          id: "desc",
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

  // Public mode: tier 1,2 personas with search support
  if (searchQuery && searchQuery.trim()) {
    try {
      const embedding = await createTextEmbedding(searchQuery, "retrieval.query");
      const personas = await prisma.$queryRaw<TPersona[]>`
        SELECT id, name, source, prompt, tags, tier
        FROM "Persona"
        WHERE "embedding" <=> ${JSON.stringify(embedding)}::vector < 0.9 AND locale = ${locale} AND tier = ANY(${[1, 2]})
        ORDER BY "embedding" <=> ${JSON.stringify(embedding)}::vector ASC
        LIMIT ${pageSize}
        OFFSET ${skip}
      `;
      const totalCountResult = await prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*) as count
        FROM "Persona"
        WHERE "embedding" <=> ${JSON.stringify(embedding)}::vector < 0.9 AND locale = ${locale} AND tier = ANY(${[1, 2]})
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

  const where = {
    tier: { in: [1, 2] },
    locale,
  };
  // Regular search (no query or fallback from vector search error)
  const [personas, totalCount] = await Promise.all([
    prisma.persona.findMany({
      where,
      orderBy: {
        id: "desc",
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
