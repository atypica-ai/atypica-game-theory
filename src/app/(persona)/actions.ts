"use server";
import { createTextEmbedding } from "@/ai/embedding";
import authOptions from "@/app/(auth)/authOptions";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
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
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { generateId, Message } from "ai";
import { getServerSession } from "next-auth";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { forbidden, notFound } from "next/navigation";
import { processPersonaImport } from "./processing";
import { PersonaImportAnalysis } from "./types";

type TPersona = Pick<Persona, "id" | "name" | "source" | "prompt" | "tier"> & { tags: string[] };

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
        WHERE "embedding" <=> ${JSON.stringify(embedding)}::vector < 0.9 AND locale = ${locale} AND tier = ANY(${tiers})
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
    const data = await prisma.personaImport.create({
      data: {
        userId: user.id,
        attachments: [{ objectUrl, name, size, mimeType }],
      },
    });
    const personaImport = {
      ...data,
      attachments: data.attachments as unknown as ChatMessageAttachment[],
      extra: data.extra as unknown as PersonaImportExtra,
    };
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

export async function fetchPersonaById(
  personaId: number,
): Promise<ServerActionResult<Omit<Persona, "tags"> & { tags: string[] }>> {
  const persona = await prisma.persona.findUnique({
    where: { id: personaId },
  });
  if (!persona) {
    return {
      success: false,
      code: "not_found",
      message: "Persona not found",
    };
  }
  return {
    success: true,
    data: {
      ...persona,
      tags: persona.tags as string[],
    },
  };
}

export async function fetchPersonaWithDetails(personaId: number): Promise<
  ServerActionResult<{
    persona: Omit<Persona, "tags"> & { tags: string[] };
    analysis: Partial<PersonaImportAnalysis> | null;
    personaImportId: number | null;
  }>
> {
  // `withAuth` will handle session check
  return withAuth(async () => {
    // This function already checks for admin or ownership
    const accessResult = await checkPersonaAccess(personaId);
    if (!accessResult.success) {
      return {
        success: false,
        code: accessResult.code,
        message: accessResult.message,
      };
    }

    const personaWithImport = accessResult.data;

    const { personaImport, tags, ...persona } = personaWithImport;

    return {
      success: true,
      data: {
        persona: {
          ...persona,
          tags: tags as string[],
        },
        analysis: personaImport
          ? (personaImport.analysis as Partial<PersonaImportAnalysis> | null)
          : null,
        personaImportId: personaImport?.id ?? null,
      },
    };
  });
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
    const analysis = personaImport.analysis as PersonaImportAnalysis | null;
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
    const parts = [{ type: "text", text: content }];

    const userChat = await prisma.$transaction(async (tx) => {
      const userChat = await createUserChat({
        userId: user.id,
        title: "Follow-up Interview",
        kind: "interviewSession",
        tx,
      });

      await tx.chatMessage.create({
        data: {
          messageId: generateId(),
          userChatId: userChat.id,
          role: "assistant", // 改为助手角色
          content,
          parts: parts as InputJsonValue,
        },
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

async function checkPersonaAccess(
  personaId: number,
): Promise<ServerActionResult<Persona & { personaImport: PersonaImport | null }>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      success: false,
      code: "unauthorized",
      message: "Authentication required",
    };
  }

  const persona = await prisma.persona.findUnique({
    where: { id: personaId },
    include: {
      personaImport: true,
    },
  });

  if (!persona) {
    return {
      success: false,
      code: "not_found",
      message: "Persona not found",
    };
  }

  // Check if user has admin permission
  try {
    await checkAdminAuth([AdminPermission.MANAGE_PERSONAS]);
    return {
      success: true,
      data: persona,
    };
  } catch {
    // User doesn't have admin permission, check if they own the persona
    if (persona.personaImport && persona.personaImport.userId === session.user.id) {
      return {
        success: true,
        data: persona,
      };
    }
    return {
      success: false,
      code: "forbidden",
      message: "Access denied",
    };
  }
}

export async function fetchUserPersonas(): Promise<
  ServerActionResult<
    Array<
      Pick<Persona, "id" | "name" | "source" | "personaImportId" | "tier" | "createdAt"> & {
        tags: string[];
        personaImportProcessing: boolean;
      }
    >
  >
> {
  return withAuth(async (user) => {
    const personas = await prisma.persona.findMany({
      where: {
        personaImport: {
          userId: user.id,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        source: true,
        tags: true,
        tier: true,
        createdAt: true,
        personaImportId: true,
        personaImport: { select: { extra: true } },
      },
    });

    return {
      success: true,
      data: personas.map(({ personaImport, tags, ...persona }) => ({
        ...persona,
        tags: tags as string[],
        personaImportProcessing: Boolean(
          personaImport?.extra && (personaImport.extra as PersonaImportExtra).processing,
        ),
      })),
    };
  });
}

export async function createOrGetUserPersonaChat(
  personaId: number,
): Promise<ServerActionResult<{ token: string }>> {
  return withAuth(async (user) => {
    // Check if persona exists and user has access
    const accessResult = await checkPersonaAccess(personaId);
    if (!accessResult.success) {
      return {
        success: false,
        code: accessResult.code,
        message: accessResult.message,
      };
    }

    const persona = accessResult.data;

    // Check if UserPersonaChat already exists
    const existingUserPersonaChat = await prisma.userPersonaChatRelation.findUnique({
      where: {
        userId_personaId: {
          userId: user.id,
          personaId: personaId,
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
          personaId: personaId,
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

export async function fetchPersonaChatStat(personaId: number): Promise<
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
      where: { personaId: personaId, userId: user.id },
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
): Promise<ServerActionResult<{ messages: Message[] }>> {
  return withAuth(async (user) => {
    // 查找PersonaImport及其关联的extraUserChat
    const personaImport = await prisma.personaImport.findUnique({
      where: { id: personaImportId, userId: user.id },
      include: {
        extraUserChat: {
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
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
    const messages = personaImport.extraUserChat.messages.map((msg) => ({
      id: msg.messageId,
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt,
    }));

    return {
      success: true,
      data: { messages },
    };
  });
}
