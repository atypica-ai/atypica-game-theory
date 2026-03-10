"use server";
import { convertDBMessageToAIMessage, persistentAIMessageToDB } from "@/ai/messageUtils";
import { trackEventServerSide } from "@/lib/analytics/server";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { detectInputLanguage } from "@/lib/textUtils";
import { createUserChat } from "@/lib/userChat/lib";
import {
  ChatMessageAttachment,
  Persona,
  PersonaImport,
  PersonaImportExtra,
  UserChat,
} from "@/prisma/client";
import { prisma, prismaRO } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { searchPersonas as searchPersonasFromMeili } from "@/search/lib/queries";
import { syncPersona as syncPersonaToMeili } from "@/search/lib/sync";
import { waitUntil } from "@vercel/functions";
import { generateId, UIMessage } from "ai";
import { notFound } from "next/navigation";
import { processPersonaImport } from "./processing";

/**
 * 管理员可以访问 tier 0,1,2,3 (所有personas)
 * 普通用户可以访问 tier 1,2 (高质量的), 目前 tier3 的还不支持
 */

export async function createPersonaImport({
  objectUrl,
  name,
  size,
  mimeType,
}: ChatMessageAttachment): Promise<
  ServerActionResult<
    Omit<PersonaImport, "extra" | "attachments"> & {
      attachments: ChatMessageAttachment[];
      extra: PersonaImportExtra;
    }
  >
> {
  return withAuth(async (user) => {
    const personaImport = await prisma.personaImport.create({
      data: {
        userId: user.id,
        attachments: [{ objectUrl, name, size, mimeType }],
      },
    });

    // Track persona import started
    trackEventServerSide({
      userId: user.id,
      event: "Persona Import Started",
      properties: {
        personaImportId: personaImport.id,
        fileSize: size,
      },
    });

    // Start processing immediately in the background using waitUntil
    waitUntil(processPersonaImport(personaImport.id));
    return {
      success: true,
      data: { ...personaImport },
    };
  });
}

export async function processPersonaImportAction(
  personaImportId: number,
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    // ensure personaImport belongs to user
    const personaImport = await prisma.personaImport
      .findUniqueOrThrow({
        where: {
          id: personaImportId,
          userId: user.id,
        },
      })
      .catch(() => notFound());
    // process in background using waitUntil
    waitUntil(processPersonaImport(personaImport.id));
    return {
      success: true,
      data: undefined,
    };
  });
}

/**
 * 接口不需要权限，也不需要登录，只要看到 personaToken 的就都可以访问
 */
export async function fetchPersonaWithDetails(personaToken: string): Promise<
  ServerActionResult<{
    persona: Pick<Persona, "name" | "source" | "prompt" | "locale" | "tier" | "createdAt"> & {
      token: string;
      tags: string[];
    };
    personaImport: Pick<PersonaImport, "id" | "userId" | "analysis"> | null;
  }>
> {
  const personaWithImport = await prisma.persona.findUnique({
    where: { token: personaToken },
    select: {
      token: true,
      name: true,
      source: true,
      prompt: true,
      locale: true,
      tier: true,
      createdAt: true,
      tags: true,
      personaImport: {
        select: {
          id: true,
          userId: true,
          analysis: true,
        },
      },
    },
  });
  if (!personaWithImport) {
    return {
      success: false,
      code: "not_found",
      message: "Persona not found",
    };
  }

  const { personaImport, ...persona } = personaWithImport;

  return {
    success: true,
    data: {
      persona,
      personaImport,
    },
  };
}

export async function createFollowUpInterviewChat(
  personaImportId: number,
): Promise<ServerActionResult<{ token: string }>> {
  return withAuth(async (user) => {
    // Check if persona import exists and belongs to user
    const personaImport = await prisma.personaImport.findUnique({
      where: { id: personaImportId, userId: user.id },
      include: {
        extraUserChat: true,
      },
    });

    if (!personaImport) {
      return {
        success: false,
        code: "not_found",
        message: "Persona import not found",
      };
    }

    // Check if follow-up chat already exists
    if (personaImport.extraUserChat) {
      return {
        success: true,
        data: { token: personaImport.extraUserChat.token },
      };
    }

    // 获取分析结果中的第一个补充问题
    const analysis = personaImport.analysis;
    const firstQuestion = analysis?.supplementaryQuestions?.questions?.[0];

    // followup chat 的开场白默认使用导入文件的语言 (context 字段)
    const locale = await detectInputLanguage({
      text: personaImport.context,
    });

    // 如果有补充问题，使用第一个问题；否则使用默认开场白
    const prologue =
      locale === "zh-CN"
        ? "您好！我想了解一些额外的信息。让我们开始吧！"
        : "Hello! I want to learn some additional information. Let's get started!";
    const content = firstQuestion ? `${prologue}\n${firstQuestion}` : prologue;

    const userChat = await prisma.$transaction(async (tx) => {
      const userChat = await createUserChat({
        userId: user.id,
        title: "Follow-up Interview",
        kind: "interviewSession",
        tx,
      });

      await persistentAIMessageToDB({
        mode: "append",
        userChatId: userChat.id,
        message: {
          id: generateId(),
          role: "assistant", // 改为助手角色
          parts: [{ type: "text", text: content }],
        },
        tx,
      });

      // Update persona import with the chat reference
      const x = await tx.personaImport.updateMany({
        where: {
          id: personaImportId,
          extraUserChatId: { equals: null },
        },
        data: {
          extraUserChatId: userChat.id,
        },
      });

      if (x.count !== 1) {
        throw new Error("Failed to update persona import");
      }

      return userChat;
    });

    return {
      success: true,
      data: { token: userChat.token },
    };
  });
}

export async function fetchFollowUpInterviewChat(
  token: string,
): Promise<ServerActionResult<UserChat>> {
  const userChat = await prisma.userChat.findUnique({
    where: { token, kind: "interviewSession" },
  });

  if (!userChat) {
    return {
      success: false,
      code: "not_found",
      message: "Follow-up interview not found",
    };
  }

  return {
    success: true,
    data: userChat,
  };
}

/**
 * 从 slug 提取 ID（格式：persona-123）
 */
function extractPersonaIdFromSlug(slug: string): number {
  const match = slug.match(/^persona-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

export async function fetchUserPersonas({
  searchQuery,
  page = 1,
  pageSize = 11,
  archived = false,
}: {
  searchQuery?: string;
  page?: number;
  pageSize?: number;
  archived?: boolean;
} = {}): Promise<
  ServerActionResult<
    Array<
      Pick<Persona, "name" | "source" | "personaImportId" | "tier" | "createdAt"> & {
        id: number;
        token: string;
        tags: string[];
        personaImportProcessing: boolean;
      }
    >
  >
> {
  return withAuth(async (user) => {
    const skip = (page - 1) * pageSize;
    const emptyResult = {
      success: true as const,
      data: [],
      pagination: { page, pageSize, totalCount: 0, totalPages: 0 },
    };
    let orderedIds: number[];
    let totalCount: number;

    if (searchQuery?.trim()) {
      try {
        const searchResults = await searchPersonasFromMeili({
          query: searchQuery.trim(),
          userId: user.id,
          archived,
          page,
          pageSize,
        });
        if (searchResults.hits.length === 0) return emptyResult;
        orderedIds = searchResults.hits.map((hit) => extractPersonaIdFromSlug(hit.slug));
        totalCount = searchResults.totalHits;
      } catch {
        return emptyResult;
      }
    } else if (archived) {
      const [{ count }] = await prismaRO.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM "Persona" p
        JOIN "PersonaImport" pi ON p."personaImportId" = pi."id"
        WHERE pi."userId" = ${user.id}
        AND p."extra" @> '{"archived":true}'::jsonb`;
      totalCount = Number(count);
      if (totalCount === 0) return emptyResult;
      const rows = await prismaRO.$queryRaw<{ id: number }[]>`
        SELECT p."id" FROM "Persona" p
        JOIN "PersonaImport" pi ON p."personaImportId" = pi."id"
        WHERE pi."userId" = ${user.id}
        AND p."extra" @> '{"archived":true}'::jsonb
        ORDER BY p."createdAt" DESC LIMIT ${pageSize} OFFSET ${skip}`;
      orderedIds = rows.map((r) => r.id);
    } else {
      const [{ count }] = await prismaRO.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM "Persona" p
        JOIN "PersonaImport" pi ON p."personaImportId" = pi."id"
        WHERE pi."userId" = ${user.id}
        AND NOT (p."extra" @> '{"archived":true}'::jsonb)`;
      totalCount = Number(count);
      if (totalCount === 0) return emptyResult;
      const rows = await prismaRO.$queryRaw<{ id: number }[]>`
        SELECT p."id" FROM "Persona" p
        JOIN "PersonaImport" pi ON p."personaImportId" = pi."id"
        WHERE pi."userId" = ${user.id}
        AND NOT (p."extra" @> '{"archived":true}'::jsonb)
        ORDER BY p."createdAt" DESC LIMIT ${pageSize} OFFSET ${skip}`;
      orderedIds = rows.map((r) => r.id);
    }

    if (orderedIds.length === 0) {
      return {
        success: true as const,
        data: [],
        pagination: { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) },
      };
    }

    const personas = await prismaRO.persona.findMany({
      where: { id: { in: orderedIds } },
      select: {
        id: true,
        token: true,
        name: true,
        source: true,
        tags: true,
        tier: true,
        createdAt: true,
        personaImportId: true,
        personaImport: { select: { extra: true } },
      },
    });

    const mappedPersonas = personas.map(({ personaImport, token, tags, id, ...persona }) => ({
      ...persona,
      id,
      token,
      tags,
      personaImportProcessing: Boolean(personaImport?.extra && personaImport.extra.processing),
    }));

    const idToPersona = new Map(mappedPersonas.map((p) => [p.id, p]));
    const sortedPersonas = orderedIds
      .map((id) => idToPersona.get(id))
      .filter((p): p is (typeof mappedPersonas)[0] => p !== undefined);

    return {
      success: true,
      data: sortedPersonas,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  });
}

export async function archivePersona(
  personaId: number,
  archived: boolean,
): Promise<ServerActionResult<null>> {
  return withAuth(async (user) => {
    // 确保 persona 属于用户
    const persona = await prisma.persona.findUnique({
      where: { id: personaId, personaImport: { userId: user.id } },
      select: { id: true },
    });
    if (!persona) return { success: false, message: "Not found", code: "not_found" };
    await mergeExtra({ tableName: "Persona", id: personaId, extra: { archived } });
    waitUntil(
      syncPersonaToMeili(personaId).catch(() => {
        // 方法里已经 log 了，无需再次 log，这里跳过错误
      }),
    );
    return { success: true, data: null };
  });
}

/**
 * 接口不需要权限，但需要需要登录，人和用户只要看到 personaToken 的就都可以和它聊天
 */
export async function createOrGetUserPersonaChat(
  personaToken: string,
): Promise<ServerActionResult<{ token: string }>> {
  return withAuth(async (user) => {
    // Check if persona exists and user has access
    const persona = await prisma.persona.findUnique({
      where: { token: personaToken },
      select: { id: true, name: true },
    });
    if (!persona) {
      return {
        success: false,
        code: "not_found",
        message: "Persona not found",
      };
    }

    // Check if UserPersonaChat already exists
    const existingUserPersonaChat = await prisma.userPersonaChatRelation.findUnique({
      where: {
        userId_personaId: {
          userId: user.id,
          personaId: persona.id,
        },
      },
      include: {
        userChat: true,
      },
    });

    if (existingUserPersonaChat) {
      return {
        success: true,
        data: { token: existingUserPersonaChat.userChat.token },
      };
    }

    // Create new UserChat and UserPersonaChat
    const userChat = await prisma.$transaction(async (tx) => {
      const userChat = await createUserChat({
        userId: user.id,
        title: `Chat with ${persona.name}`,
        kind: "misc",
        tx,
      });

      await tx.userPersonaChatRelation.create({
        data: {
          userId: user.id,
          personaId: persona.id,
          userChatId: userChat.id,
        },
      });

      return userChat;
    });

    return {
      success: true,
      data: { token: userChat.token },
    };
  });
}

export async function fetchUserPersonaChatByToken(token: string): Promise<
  ServerActionResult<{
    userChat: UserChat;
    persona: Persona;
  }>
> {
  return withAuth(async (user) => {
    const userChat = await prisma.userChat.findUnique({
      where: {
        token: token,
        userId: user.id, //如果不是当前用户，返回 404
      },
      include: {
        userPersonaChatRelation: {
          include: {
            persona: true,
          },
        },
      },
    });

    if (!userChat || !userChat.userPersonaChatRelation) {
      return {
        success: false,
        code: "not_found",
        message: "Persona chat not found",
      };
    }

    // 这个其实不会触发，因为 where 过滤了 userId，但是这个判断还是留着
    if (userChat.userId !== user.id) {
      return {
        success: false,
        code: "forbidden",
        message: "Access denied",
      };
    }

    const persona = userChat.userPersonaChatRelation.persona;

    return {
      success: true,
      data: { userChat, persona },
    };
  });
}

export async function fetchPersonaChatStat(personaToken: string): Promise<
  ServerActionResult<
    Array<{
      messageCount: number;
      lastMessageAt: Date | null;
    }>
  >
> {
  return withAuth(async (user) => {
    // Fetch all chat sessions for this persona
    const chatRelations = await prisma.userPersonaChatRelation.findMany({
      where: {
        persona: { token: personaToken },
        userId: user.id,
      },
      include: {
        userChat: {
          select: {
            _count: { select: { messages: true } },
            messages: {
              select: { createdAt: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const chatHistory = chatRelations.map((relation) => ({
      messageCount: relation.userChat._count.messages,
      lastMessageAt: relation.userChat.messages[0]?.createdAt || null,
    }));

    return {
      success: true,
      data: chatHistory,
    };
  });
}

// 清理聊天记录
export async function clearPersonaChatHistory(
  userChatToken: string,
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    const userChat = await prisma.userChat
      .findUniqueOrThrow({
        where: { token: userChatToken, userId: user.id },
      })
      .catch(() => notFound());
    // 删除所有聊天消息
    await prisma.chatMessage.deleteMany({
      where: { userChatId: userChat.id },
    });
    return {
      success: true,
      data: undefined,
    };
  });
}

// 获取后续访谈历史记录
export async function fetchFollowUpInterviewHistory(personaImportId: number): Promise<
  ServerActionResult<{
    hasHistory: boolean;
    userChatToken?: string;
    messageCount?: number;
    lastMessageAt?: Date;
  }>
> {
  return withAuth(async (user) => {
    // 查找PersonaImport及其关联的extraUserChat
    const personaImport = await prisma.personaImport.findUnique({
      where: { id: personaImportId, userId: user.id },
      include: {
        extraUserChat: {
          include: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1, // 只获取最新的一条消息来获取时间
            },
          },
        },
      },
    });

    if (!personaImport) {
      return {
        success: false,
        code: "not_found",
        message: "Persona import not found",
      };
    }

    if (!personaImport.extraUserChat) {
      return {
        success: true,
        data: {
          hasHistory: false,
        },
      };
    }

    // 获取消息总数
    const messageCount = await prisma.chatMessage.count({
      where: {
        userChatId: personaImport.extraUserChat.id,
        content: { not: "[READY]" }, // 排除系统消息
      },
    });

    const lastMessage = personaImport.extraUserChat.messages[0];

    return {
      success: true,
      data: {
        hasHistory: messageCount > 0,
        userChatToken: personaImport.extraUserChat.token,
        messageCount,
        lastMessageAt: lastMessage?.createdAt,
      },
    };
  });
}

// 获取后续访谈聊天消息
export async function fetchFollowUpInterviewChatMessages(
  personaImportId: number,
): Promise<ServerActionResult<{ messages: UIMessage[] }>> {
  return withAuth(async (user) => {
    // 查找PersonaImport及其关联的extraUserChat
    const personaImport = await prisma.personaImport.findUnique({
      where: { id: personaImportId, userId: user.id },
      include: {
        extraUserChat: {
          include: {
            messages: {
              orderBy: { id: "asc" },
            },
          },
        },
      },
    });

    if (!personaImport) {
      return {
        success: false,
        code: "not_found",
        message: "Persona import not found",
      };
    }

    if (!personaImport.extraUserChat) {
      return {
        success: true,
        data: { messages: [] },
      };
    }

    // 转换消息格式以匹配前端期望的格式
    const messages = personaImport.extraUserChat.messages.map(convertDBMessageToAIMessage);

    return {
      success: true,
      data: { messages },
    };
  });
}
