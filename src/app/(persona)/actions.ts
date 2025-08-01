"use server";
import authOptions from "@/app/(auth)/authOptions";
import { analyzeInterviewCompleteness, buildPersonaAgentPrompt } from "@/app/(persona)/processing";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
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
import { notFound } from "next/navigation";

export async function createPersonaImport({
  objectUrl,
  name,
  size,
  mimeType,
}: ChatMessageAttachment): Promise<
  ServerActionResult<
    Omit<PersonaImport, "extra"> & {
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
    waitUntil(
      Promise.all([
        buildPersonaAgentPrompt(personaImport),
        analyzeInterviewCompleteness(personaImport),
      ]),
    );
    return {
      success: true,
      data: { ...personaImport },
    };
  });
}

export async function reAnalyzePersonaImport(
  personaImportId: number,
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    // Find the existing PersonaImport
    const personaImport = await prisma.personaImport.findUnique({
      where: { id: personaImportId, userId: user.id },
    });

    if (!personaImport) {
      return {
        success: false,
        message: "Persona import not found",
      };
    }

    // Clear existing results and errors
    await prisma.personaImport.update({
      where: { id: personaImportId },
      data: {
        analysis: {},
        extra: {},
      },
    });

    const personaImportWithAttachments = {
      ...personaImport,
      attachments: personaImport.attachments as unknown as ChatMessageAttachment[],
    };

    // Start processing again in the background
    waitUntil(
      Promise.all([
        buildPersonaAgentPrompt(personaImportWithAttachments),
        analyzeInterviewCompleteness(personaImportWithAttachments),
      ]),
    );

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

    const content = "[READY]";
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
          role: "user",
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

export async function checkPersonaAccess(
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
        personaImportId: true,
        tags: true,
        tier: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      data: personas.map((persona) => ({
        ...persona,
        tags: persona.tags as string[],
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
