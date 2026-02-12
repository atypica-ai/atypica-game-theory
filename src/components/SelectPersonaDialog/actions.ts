"use server";
import { createTextEmbedding } from "@/ai/embedding";
import authOptions from "@/app/(auth)/authOptions";
import { ServerActionResult } from "@/lib/serverAction";
import { Persona } from "@/prisma/client";
import { prismaRO } from "@/prisma/prisma";
import { searchPersonas as searchPersonasFromMeili } from "@/search/lib/queries";
import { getServerSession } from "next-auth";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { forbidden } from "next/navigation";

type TPersona = Pick<Persona, "name" | "source" | "prompt" | "tier"> & {
  token: string;
  tags: string[];
};

export async function fetchPersonasWithMeili({
  locale,
  searchQuery = "",
  private: isPrivate = false,
  page = 1,
  pageSize = 12,
}: {
  locale?: Locale;
  searchQuery?: string;
  private?: boolean;
  page?: number;
  pageSize?: number;
} = {}): Promise<ServerActionResult<TPersona[]>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    forbidden();
  }

  locale = locale || (await getLocale());

  try {
    // 统一使用 Meilisearch 搜索
    const searchResults = isPrivate
      ? // 搜索用户自己的 personas（所有 tier）
        await searchPersonasFromMeili({
          query: searchQuery,
          userId: session.user.id,
          locales: [locale],
          page,
          pageSize,
        })
      : // 搜索公开的 personas（tier 1, 2）
        await searchPersonasFromMeili({
          query: searchQuery,
          tiers: [1, 2],
          locales: [locale],
          page,
          pageSize,
        });

    // Extract persona IDs from slugs
    const personaIds = searchResults.hits
      .map((hit) => {
        const match = hit.slug.match(/^persona-(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((id) => id > 0);

    if (personaIds.length === 0) {
      return {
        success: true,
        data: [],
        pagination: {
          page,
          pageSize,
          totalCount: 0,
          totalPages: 0,
        },
      };
    }

    // Query database for full persona data
    const personas = await prismaRO.persona.findMany({
      where: { id: { in: personaIds } },
      select: {
        id: true,
        token: true,
        name: true,
        source: true,
        prompt: true,
        tags: true,
        tier: true,
      },
    });

    // Maintain Meilisearch order
    const personaMap = new Map(personas.map((p) => [p.id, p]));
    const orderedPersonas = personaIds
      .map((id) => personaMap.get(id))
      .filter(Boolean) as typeof personas;

    return {
      success: true,
      data: orderedPersonas.map((persona) => ({
        ...persona,
        tags: persona.tags,
      })),
      pagination: {
        page,
        pageSize,
        totalCount: searchResults.totalHits,
        totalPages: searchResults.totalPages,
      },
    };
  } catch (error) {
    console.log(`Meilisearch search error: ${(error as Error).message}`);
    return {
      success: false,
      message: "Persona search error",
    };
  }
}

/**
 * @deprecated
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchPersonasWithEmbedding({
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
      prismaRO.persona.findMany({
        where,
        orderBy: {
          id: "desc",
        },
        select: {
          token: true,
          name: true,
          source: true,
          prompt: true,
          tags: true,
          tier: true,
        },
        skip,
        take: pageSize,
      }),
      prismaRO.persona.count({ where }),
    ]);

    return {
      success: true,
      data: personas,
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
      const personas = await prismaRO.$queryRaw<TPersona[]>`
        SELECT token, name, source, prompt, tags, tier
        FROM "Persona"
        WHERE "embedding" <=> ${JSON.stringify(embedding)}::halfvec < 0.9 AND locale = ${locale} AND tier = ANY(${[1, 2]})
        ORDER BY "embedding" <=> ${JSON.stringify(embedding)}::halfvec ASC
        LIMIT ${pageSize}
        OFFSET ${skip}
      `;
      const totalCountResult = await prismaRO.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*) as count
        FROM "Persona"
        WHERE "embedding" <=> ${JSON.stringify(embedding)}::halfvec < 0.9 AND locale = ${locale} AND tier = ANY(${[1, 2]})
      `;
      // 向量搜索的结果现在看起来最多就是 40，这个应该是索引的设置
      const totalCount = Math.min(40, Number(totalCountResult[0].count));
      return {
        success: true,
        data: personas,
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
    prismaRO.persona.findMany({
      where,
      orderBy: {
        id: "desc",
      },
      select: {
        token: true,
        name: true,
        source: true,
        prompt: true,
        tags: true,
        tier: true,
      },
      skip,
      take: pageSize,
    }),
    prismaRO.persona.count({ where }),
  ]);

  return {
    success: true,
    data: personas.map(({ token, tags, ...persona }) => {
      return {
        ...persona,
        token: token,
        tags: tags,
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
