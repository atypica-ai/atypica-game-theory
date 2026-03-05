"use server";
import { UserChatContext } from "@/app/(study)/context/types";
import { createUniversalUserChat } from "@/app/(universal)/lib";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { Persona, Prisma, UserChatExtra, UserChatKind } from "@/prisma/client";
import { PersonaPanelWhereInput } from "@/prisma/models";
import { prisma, prismaRO } from "@/prisma/prisma";
import { searchProjects as searchProjectsFromMeili } from "@/search/lib/queries";
import { getLocale } from "next-intl/server";

export interface PersonaPanelWithDetails {
  id: number;
  title: string;
  instruction: string;
  personaIds: number[];
  personas: Pick<
    Persona,
    "id" | "name" | "token" | "tags" | "source" | "prompt" | "extra" | "createdAt"
  >[];
  createdAt: Date;
  updatedAt: Date;
  usageCount: {
    discussions: number;
    interviews: number;
  };
}

/**
 * 从 slug 提取 ID（格式：panel-123）
 */
function extractPanelIdFromSlug(slug: string): number {
  const match = slug.match(/^panel-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * 从 slug 提取 UserChat ID（格式：study-123, universal-123 等）
 */
function extractIdFromSlug(slug: string): number {
  const match = slug.match(/^(?:study|universal|scout|interview)-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

export async function fetchUserPersonaPanels({
  searchQuery,
  page = 1,
  pageSize = 10,
}: {
  searchQuery?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<ServerActionResult<PersonaPanelWithDetails[]>> {
  return withAuth(async (user) => {
    const skip = (page - 1) * pageSize;
    let where: PersonaPanelWhereInput = { userId: user.id };
    let orderedIds: number[] | null = null;
    let totalCount = 0;
    let useDatabasePagination = true;

    if (searchQuery?.trim()) {
      try {
        const searchResults = await searchProjectsFromMeili({
          query: searchQuery.trim(),
          type: "panel",
          userId: user.id,
          page,
          pageSize,
        });

        if (searchResults.hits.length === 0) {
          return {
            success: true,
            data: [],
            pagination: { page, pageSize, totalCount: 0, totalPages: 0 },
          };
        }

        orderedIds = searchResults.hits.map((hit) => extractPanelIdFromSlug(hit.slug));
        where = { userId: user.id, id: { in: orderedIds } };
        totalCount = searchResults.totalHits;
        useDatabasePagination = false;
      } catch (error) {
        rootLogger.error({
          msg: "MeiliSearch panel search failed",
          error: error instanceof Error ? error.message : String(error),
        });
        return {
          success: true,
          data: [],
          pagination: { page, pageSize, totalCount: 0, totalPages: 0 },
        };
      }
    }

    const panels = await prismaRO.personaPanel.findMany({
      where,
      orderBy: orderedIds ? undefined : { createdAt: "desc" },
      skip: useDatabasePagination ? skip : undefined,
      take: useDatabasePagination ? pageSize : undefined,
      select: {
        id: true,
        title: true,
        instruction: true,
        personaIds: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            discussionTimelines: true,
            analystInterviews: true,
          },
        },
      },
    });

    if (useDatabasePagination) {
      totalCount = await prismaRO.personaPanel.count({ where });
    }

    const allPersonaIds = panels.flatMap((panel) => panel.personaIds);
    const uniquePersonaIds = [...new Set(allPersonaIds)];

    const personas = await prismaRO.persona.findMany({
      where: { id: { in: uniquePersonaIds } },
      select: {
        id: true,
        name: true,
        token: true,
        tags: true,
        source: true,
        prompt: true,
        extra: true,
        createdAt: true,
      },
    });

    const personaMap = new Map(personas.map((p) => [p.id, p]));

    const panelsWithDetails: PersonaPanelWithDetails[] = panels.map((panel) => ({
      id: panel.id,
      title: panel.title,
      instruction: panel.instruction,
      personaIds: panel.personaIds,
      personas: panel.personaIds.map((id) => personaMap.get(id)).filter((p) => p !== undefined),
      createdAt: panel.createdAt,
      updatedAt: panel.updatedAt,
      usageCount: {
        discussions: panel._count.discussionTimelines,
        interviews: panel._count.analystInterviews,
      },
    }));

    // MeiliSearch 搜索时，按返回的顺序排序
    const sortedPanels = orderedIds
      ? (() => {
          const idToPanel = new Map(panelsWithDetails.map((p) => [p.id, p]));
          return orderedIds
            .map((id) => idToPanel.get(id))
            .filter((p): p is PersonaPanelWithDetails => p !== undefined);
        })()
      : panelsWithDetails;

    return {
      success: true,
      data: sortedPanels,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  });
}

export async function deletePersonaPanel(
  panelId: number,
): Promise<ServerActionResult<{ id: number }>> {
  return withAuth(async (user) => {
    const panel = await prisma.personaPanel.findUnique({
      where: { id: panelId, userId: user.id },
      select: {
        id: true,
        _count: {
          select: {
            discussionTimelines: true,
            analystInterviews: true,
          },
        },
      },
    });

    if (!panel) {
      return {
        success: false,
        code: "not_found",
        message: "PersonaPanel not found or you don't have permission to delete it",
      };
    }

    if (panel._count.discussionTimelines > 0 || panel._count.analystInterviews > 0) {
      return {
        success: false,
        code: "forbidden",
        message: "Cannot delete PersonaPanel that is being used in discussions or interviews",
      };
    }

    await prisma.personaPanel.delete({ where: { id: panelId } });

    return { success: true, data: { id: panelId } };
  });
}

/**
 * Create a new Panel via Universal Agent.
 * Creates a UserChat with the user's description + explicit tool-chaining instruction.
 * Does NOT execute the agent — the frontend triggers execution via useChat.regenerate()
 * with executionMode:"sync", so the agent streams in real-time and stops when the
 * dialog closes or the page refreshes.
 *
 * The agent will: searchPersonas → requestSelectPersonas (waits for user) → updatePanel.
 */
export async function createPanelViaAgent(
  description: string,
  options: {
    mode: "auto" | "manual";
  },
): Promise<ServerActionResult<{ token: string }>> {
  return withAuth(async (user) => {
    const locale = await getLocale();
    const { mode } = options;

    const content =
      mode === "auto"
        ? locale === "zh-CN"
          ? `我想创建一个 Persona Panel。我的需求是：${description}

请严格按以下步骤执行，每完成一步立即调用下一个工具，不要输出分析文本：
1. searchPersonas — 根据我的需求搜索合适的人选
2. requestSelectPersonas — 将步骤 1 搜索到的 persona ID 列表作为 personaIds 参数传入，让我确认选择
3. 等我选择完成后，调用 updatePanel，用确认的 personaIds 和一个描述性标题保存 Panel

立即开始步骤 1。`
          : `I want to create a Persona Panel. My needs: ${description}

Execute these steps strictly in order. Call the next tool immediately — do NOT output intermediate text:
1. searchPersonas — search for suitable personas based on my needs
2. requestSelectPersonas — pass the persona IDs from step 1 as the personaIds parameter
3. After user confirms, call updatePanel with the confirmed personaIds and a descriptive title

Start step 1 now.`
        : // Manual mode — skip search, go straight to persona selector
          locale === "zh-CN"
          ? `我想创建一个 Persona Panel。我的需求是：${description}

请严格按以下步骤执行，每完成一步立即调用下一个工具，不要输出分析文本：
1. requestSelectPersonas — 直接打开选择器让我手动选择 Persona（传空 personaIds 数组）
2. 等我选择完成后，调用 updatePanel，用确认的 personaIds 和一个描述性标题保存 Panel

立即开始步骤 1。`
          : `I want to create a Persona Panel. My needs: ${description}

Execute these steps strictly in order. Call the next tool immediately — do NOT output intermediate text:
1. requestSelectPersonas — open the selector for manual persona selection (pass empty personaIds array)
2. After user confirms, call updatePanel with the confirmed personaIds and a descriptive title

Start step 1 now.`;

    const createResult = await createUniversalUserChat({
      userId: user.id,
      role: "user",
      content,
    });

    // Agent execution is now triggered by the frontend via useChat.regenerate()
    // with executionMode:"sync". This enables real-time streaming and ties the
    // agent lifecycle to the HTTP connection (dialog close → agent stops).
    //
    // Previously the agent was executed server-side here:
    // const logger = rootLogger.child({ userChatId: createResult.data.id, userChatToken: createResult.data.token });
    // const { statReport } = initGenericUserChatStatReporter({ userId: user.id, userChatId: createResult.data.id, logger });
    // await executeUniversalAgent({ userId: user.id, userChat: createResult.data, statReport, logger, locale });

    return { success: true, data: { token: createResult.token } };
  });
}

// ---------------------------------------------------------------------------
// Research Projects List (for /panels page right column)
// ---------------------------------------------------------------------------

export interface ResearchProjectWithPanel {
  id: number;
  token: string;
  title: string;
  kind: UserChatKind;
  context: UserChatContext;
  extra: UserChatExtra;
  createdAt: Date;
  updatedAt: Date;
  panel: {
    id: number;
    title: string;
    personaCount: number;
  } | null;
}

/**
 * Fetch all research projects that have a panelId in context (not limited to specific panel).
 * Supports pagination and search by project title.
 */
export async function fetchAllResearchProjects({
  page = 1,
  pageSize = 10,
  searchQuery,
  panelId,
}: {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  panelId?: number;
} = {}): Promise<ServerActionResult<ResearchProjectWithPanel[]>> {
  return withAuth(async (user) => {
    const skip = (page - 1) * pageSize;
    let where: Prisma.UserChatWhereInput = {
      userId: user.id,
      kind: { in: ["study", "universal"] },
      context: panelId
        ? { path: ["personaPanelId"], equals: panelId }
        : { path: ["personaPanelId"], not: Prisma.AnyNull },
    };
    let totalCount = 0;
    let orderedIds: number[] | null = null;
    let useDatabasePagination = true;

    if (searchQuery) {
      const trimmedQuery = searchQuery.trim();
      if (trimmedQuery) {
        // Use MeiliSearch for full-text search
        // Search both study and universal projects
        try {
          const [studyResults, universalResults] = await Promise.all([
            searchProjectsFromMeili({
              query: trimmedQuery,
              type: "study",
              userId: user.id,
              page: 1,
              pageSize: 100, // Get enough results for merging
            }),
            searchProjectsFromMeili({
              query: trimmedQuery,
              type: "universal",
              userId: user.id,
              page: 1,
              pageSize: 100,
            }),
          ]);

          // Merge hits (MeiliSearch already sorts by relevance)
          // Interleave results to give fair representation to both types
          const allHits = [];
          const maxLen = Math.max(studyResults.hits.length, universalResults.hits.length);
          for (let i = 0; i < maxLen; i++) {
            if (i < studyResults.hits.length) allHits.push(studyResults.hits[i]);
            if (i < universalResults.hits.length) allHits.push(universalResults.hits[i]);
          }

          const totalHits = studyResults.totalHits + universalResults.totalHits;

          if (allHits.length === 0) {
            return {
              success: true,
              data: [],
              pagination: { page, pageSize, totalCount: 0, totalPages: 0 },
            };
          }

          // Apply pagination after merging
          const paginatedHits = allHits.slice(skip, skip + pageSize);
          orderedIds = paginatedHits.map((hit) => extractIdFromSlug(hit.slug));

          where = {
            userId: user.id,
            kind: { in: ["study", "universal"] },
            context: {
              path: ["personaPanelId"],
              not: Prisma.AnyNull,
            },
            id: { in: orderedIds },
          };
          totalCount = totalHits;
          useDatabasePagination = false;
        } catch (error) {
          rootLogger.error({
            msg: "MeiliSearch universal projects search failed",
            error: error instanceof Error ? error.message : String(error),
          });
          return {
            success: true,
            data: [],
            pagination: { page, pageSize, totalCount: 0, totalPages: 0 },
          };
        }
      }
    }

    if (useDatabasePagination) {
      totalCount = await prismaRO.userChat.count({ where });
    }

    // Fetch paginated results
    const userChats = await prismaRO.userChat.findMany({
      where,
      select: {
        id: true,
        token: true,
        title: true,
        kind: true,
        context: true,
        extra: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: orderedIds ? undefined : { createdAt: "desc" },
      skip: useDatabasePagination ? skip : undefined,
      take: useDatabasePagination ? pageSize : undefined,
    });

    // Get unique panel IDs from all projects
    const panelIds = Array.from(
      new Set(
        userChats
          .map((chat) => (chat.context as UserChatContext).personaPanelId)
          .filter((id): id is number => typeof id === "number"),
      ),
    );

    // Fetch panel info in batch
    const panels = await prismaRO.personaPanel.findMany({
      where: {
        id: { in: panelIds },
        userId: user.id,
      },
      select: {
        id: true,
        title: true,
        personaIds: true,
      },
    });

    const panelMap = new Map(panels.map((p) => [p.id, p]));

    // Build project list with panel info
    const projectsWithPanel: ResearchProjectWithPanel[] = userChats.map((chat) => {
      const panelId = (chat.context as UserChatContext).personaPanelId;
      const panel = typeof panelId === "number" ? panelMap.get(panelId) : null;

      return {
        id: chat.id,
        token: chat.token,
        title: chat.title,
        kind: chat.kind,
        context: chat.context,
        extra: chat.extra,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        panel: panel
          ? {
              id: panel.id,
              title: panel.title,
              personaCount: panel.personaIds.length,
            }
          : null,
      };
    });

    // MeiliSearch 搜索时，按返回的顺序排序
    const sortedProjects = orderedIds
      ? (() => {
          const idToProject = new Map(projectsWithPanel.map((p) => [p.id, p]));
          return orderedIds
            .map((id) => idToProject.get(id))
            .filter((p): p is ResearchProjectWithPanel => p !== undefined);
        })()
      : projectsWithPanel;

    return {
      success: true,
      data: sortedProjects,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  });
}
