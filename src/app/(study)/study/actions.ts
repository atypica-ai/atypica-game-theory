"use server";
import {
  convertDBMessagesToAIMessages,
  convertDBMessageToAIMessage,
  persistentAIMessageToDB,
} from "@/ai/messageUtils";
import { ToolName, TStudyMessageWithTool } from "@/ai/tools/types";
import { categorizeFiles, FILE_UPLOAD_LIMITS } from "@/lib/fileUploadLimits";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { detectInputLanguage, truncateForTitle } from "@/lib/textUtils";
import { createUserChat } from "@/lib/userChat/lib";
import {
  Analyst,
  AnalystPodcast,
  AnalystReport,
  ChatMessageAttachment,
  Persona,
  UserChat,
  UserChatExtra,
} from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { AnalystKind } from "@/prisma/types";
import { generateId, UIMessage } from "ai";

export async function createStudyUserChat(
  {
    role,
    content,
    attachments,
  }: {
    role: "user" | "assistant";
    content: string;
    attachments?: ChatMessageAttachment[];
  },
  // 任何额外要存储的信息
  extra?: Pick<UserChatExtra, "briefUserChatId" | "referenceUserChats">,
): Promise<ServerActionResult<Omit<UserChat, "kind"> & { kind: "study" }>> {
  return withAuth(async (user) => {
    // Validate file upload limits
    if (attachments && attachments.length > 0) {
      const fileInfos = attachments.map((att) => ({
        name: att.name,
        size: att.size,
        mimeType: att.mimeType,
        url: "", // Not needed for validation
        objectUrl: att.objectUrl,
      }));

      const { images, documents } = categorizeFiles(fileInfos);

      if (images.length > FILE_UPLOAD_LIMITS.MAX_IMAGES) {
        return {
          success: false,
          message: `Maximum ${FILE_UPLOAD_LIMITS.MAX_IMAGES} images allowed`,
        };
      }

      if (documents.length > FILE_UPLOAD_LIMITS.MAX_DOCUMENTS) {
        return {
          success: false,
          message: `Maximum ${FILE_UPLOAD_LIMITS.MAX_DOCUMENTS} documents allowed`,
        };
      }

      const totalSize = attachments.reduce((acc, att) => acc + att.size, 0);
      if (totalSize > FILE_UPLOAD_LIMITS.MAX_TOTAL_SIZE) {
        return {
          success: false,
          message: "Total file size limit exceeded",
        };
      }
    }

    // 根据用户输入决定模型的默认语言
    const locale = await detectInputLanguage({
      text: content,
    });

    const userChat = await prisma.$transaction(async (tx) => {
      const userChat = await createUserChat({
        userId: user.id,
        title: truncateForTitle(content, {
          maxDisplayWidth: 100,
          suffix: "...",
        }),
        kind: "study",
        tx,
        extra,
      });
      await persistentAIMessageToDB({
        userChatId: userChat.id,
        message: {
          id: generateId(),
          role,
          parts: [{ type: "text", text: content }],
        },
        attachments, // attachments 单独保存
        tx,
      });
      await tx.analyst.create({
        data: {
          userId: user.id,
          studyUserChatId: userChat.id,
          brief: content, // 用户的第一条消息作为 brief
          locale,
          role: "",
          topic: "",
          studySummary: "",
          studyLog: "",
          attachments: attachments,
        },
      });
      return userChat;
    });
    return {
      success: true,
      data: {
        ...userChat,
        kind: "study",
      },
    };
  });
}

export async function createProductRnDStudyUserChat(
  {
    role,
    content,
    attachments,
  }: {
    role: "user" | "assistant";
    content: string;
    attachments?: ChatMessageAttachment[];
  },
  extra?: Pick<UserChatExtra, "briefUserChatId" | "referenceUserChats">,
): Promise<ServerActionResult<Omit<UserChat, "kind"> & { kind: "study" }>> {
  const result = await createStudyUserChat({ role, content, attachments }, extra);
  if (result.success) {
    const studyUserChatId = result.data.id;
    await prisma.analyst.update({
      where: { studyUserChatId },
      data: {
        kind: AnalystKind.productRnD,
      },
    });
  }
  return result;
}

export async function fetchUserChatByToken<Tkind extends UserChat["kind"]>(
  token: string,
  kind: Tkind,
): Promise<
  ServerActionResult<
    Omit<UserChat, "kind"> & {
      kind: Tkind;
      messages: UIMessage[];
    }
  >
> {
  const userChat = await prisma.userChat.findUnique({
    where: { token, kind },
    include: {
      messages: { orderBy: { id: "asc" } },
    },
  });
  if (!userChat) {
    return {
      success: false,
      code: "not_found",
      message: "UserChat not found",
    };
  }
  return {
    success: true,
    data: {
      ...userChat,
      kind: userChat.kind as Tkind,
      messages: await convertDBMessagesToAIMessages(userChat.messages, {
        convertObjectUrl: "HttpUrl",
      }),
    },
  };
}

export async function fetchUserChatStateByToken<Tkind extends UserChat["kind"]>(
  studyUserChatToken: string,
  kind: Tkind,
): Promise<ServerActionResult<{ backgroundToken: string | null; chatMessageUpdatedAt: Date }>> {
  const userChat = await prisma.userChat.findUnique({
    where: { token: studyUserChatToken, kind },
    select: {
      backgroundToken: true,
      updatedAt: true,
      messages: {
        select: { id: true, updatedAt: true },
        orderBy: { id: "desc" },
        take: 1,
      },
    },
  });
  if (!userChat) {
    return {
      success: false,
      code: "not_found",
      message: "User chat not found",
    };
  }
  const { backgroundToken, updatedAt, messages } = userChat;
  const chatMessageUpdatedAt = messages[0]?.updatedAt ?? updatedAt;
  return {
    success: true,
    data: { backgroundToken, chatMessageUpdatedAt },
  };
}

export async function fetchStatsByStudyUserChatToken(
  studyUserChatToken: string,
): Promise<ServerActionResult<Array<{ dimension: string; total: number | null }>>> {
  const result = await prisma.chatStatistics.groupBy({
    by: ["dimension"],
    where: {
      userChat: {
        token: studyUserChatToken,
      },
    },
    _sum: {
      value: true,
    },
  });
  return {
    success: true,
    data: result.map((item) => ({
      dimension: item.dimension,
      total: item._sum.value,
    })),
  };
}

export async function fetchAnalystByStudyUserChatToken({
  studyUserChatToken,
}: {
  studyUserChatToken: string;
}): Promise<ServerActionResult<Analyst>> {
  const studyUserChat = await prisma.userChat.findUnique({
    where: { token: studyUserChatToken, kind: "study" },
    include: {
      analyst: true,
    },
  });
  if (!studyUserChat?.analyst) {
    return {
      success: false,
      code: "not_found",
      message: "Analyst not found",
    };
  }
  return {
    success: true,
    data: { ...studyUserChat.analyst },
  };
}

/**
 * 这个方法接收一个 personaId 用于过滤，同时不需要权限，这是安全的。
 * 前端无法通过遍历 personaId 来获取所有 analystInterview，
 * personaId 仅用于过滤 studyUserChatToken 对应研究里的所有访谈（这些访谈在拥有 studyUserChatToken 的情况下，都是直接可读的）
 */
export async function fetchAnalystInterviewForPersona({
  studyUserChatToken,
  forPersonaId,
}: {
  studyUserChatToken: string;
  forPersonaId: number;
}): Promise<
  ServerActionResult<{
    conclusion: string;
    interviewUserChat: {
      token: string;
      backgroundToken: string | null;
      messages: UIMessage[];
    } | null;
    persona: {
      token: string;
      name: string;
    };
  }>
> {
  const studyUserChat = await prisma.userChat.findUnique({
    where: { token: studyUserChatToken, kind: "study" },
    include: {
      analyst: {
        select: { id: true },
      },
    },
  });
  if (!studyUserChat?.analyst) {
    return {
      success: false,
      code: "not_found",
      message: "User chat not found or analyst not found",
    };
  }
  const interview = await prisma.analystInterview.findUnique({
    where: {
      analystId_personaId: {
        analystId: studyUserChat.analyst.id,
        personaId: forPersonaId,
      },
    },
    select: {
      id: true,
      conclusion: true,
      interviewUserChat: {
        select: {
          token: true,
          backgroundToken: true,
          messages: { orderBy: { id: "asc" } },
        },
      },
      persona: {
        select: {
          token: true,
          name: true,
        },
      },
    },
  });
  if (!interview) {
    return {
      success: false,
      code: "not_found",
      message: "AnalystInterview not found",
    };
  }
  const { persona, interviewUserChat, conclusion } = interview;
  if (!persona.token) {
    return {
      success: false,
      code: "internal_server_error",
      message: "Persona token is missing",
    };
  }
  return {
    success: true,
    data: {
      conclusion,
      interviewUserChat: interviewUserChat
        ? {
            ...interviewUserChat,
            messages: interviewUserChat.messages.map(convertDBMessageToAIMessage),
          }
        : null,
      persona: {
        token: persona.token,
        name: persona.name,
      },
    },
  };
}

export async function fetchAnalystReportByToken(
  token: string,
): Promise<
  ServerActionResult<
    Pick<
      AnalystReport,
      "id" | "token" | "analystId" | "coverSvg" | "generatedAt" | "createdAt" | "updatedAt"
    > & { analyst: Analyst }
  >
> {
  const report = await prisma.analystReport.findUnique({
    where: { token },
    select: {
      id: true,
      token: true,
      analystId: true,
      analyst: true,
      coverSvg: true,
      generatedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!report) {
    return {
      success: false,
      code: "not_found",
      message: "AnalystReport not found",
    };
  }
  return {
    success: true,
    data: report,
  };
}

export async function fetchAnalystReportsOfStudyUserChat({
  studyUserChatToken,
  includeOnePageHtml = false,
}: {
  studyUserChatToken: string;
  includeOnePageHtml?: boolean;
}): Promise<
  ServerActionResult<
    (Pick<
      AnalystReport,
      "id" | "token" | "analystId" | "coverSvg" | "generatedAt" | "createdAt" | "updatedAt"
    > & { analyst: Analyst })[]
  >
> {
  const studyUserChat = await prisma.userChat.findUnique({
    where: { token: studyUserChatToken, kind: "study" },
    include: { analyst: { select: { id: true } } },
  });
  if (!studyUserChat?.analyst) {
    return {
      success: true,
      data: [],
    };
  }
  const reports = await prisma.analystReport.findMany({
    where: {
      analystId: studyUserChat.analyst.id,
      generatedAt: { not: null },
    },
    select: {
      id: true,
      token: true,
      analystId: true,
      analyst: true,
      coverSvg: true,
      generatedAt: true,
      createdAt: true,
      updatedAt: true,
      onePageHtml: includeOnePageHtml,
    },
    orderBy: { createdAt: "desc" },
  });
  return {
    success: true,
    data: reports,
  };
}

/**
 * 和 fetchAnalystInterviewForPersona 一样，这个方法是安全的，无法通过遍历 personaId 来获取所有 Persona
 */
export async function fetchPersonasSearchInStudy({
  studyUserChatToken,
  filterByPersonaIds,
}: {
  studyUserChatToken: string;
  filterByPersonaIds?: number[];
}): Promise<
  ServerActionResult<
    (Pick<Persona, "name" | "source" | "tier" | "prompt"> & {
      token: string;
      tags: string[];
    })[]
  >
> {
  const studyUserChat = await prisma.userChat.findUnique({
    where: { token: studyUserChatToken, kind: "study" },
    select: {
      messages: {
        where: { role: "assistant" },
      },
    },
  });
  if (!studyUserChat) {
    return {
      success: false,
      code: "not_found",
      message: "Study user chat not found",
    };
  }

  const uiMessages = studyUserChat.messages.map(
    convertDBMessageToAIMessage,
  ) as TStudyMessageWithTool[];

  // set 的 union 方法在生产环节会报错，还没定为原因，这里直接改用 add 方法
  const personaIds = new Set<number>();
  for (const message of uiMessages) {
    for (const part of message.parts) {
      if (part.type === `tool-${ToolName.searchPersonas}` && part.state === "output-available") {
        part.output.personas.forEach((persona) => personaIds.add(persona.personaId));
      }
    }
  }
  let ids: number[];
  if (filterByPersonaIds) {
    const filterSet = new Set(filterByPersonaIds);
    ids = Array.from(personaIds).filter((id) => filterSet.has(id));
  } else {
    ids = Array.from(personaIds);
  }

  const personas = await prisma.persona.findMany({
    where: {
      id: { in: ids },
    },
    select: {
      token: true,
      name: true,
      source: true,
      prompt: true,
      tags: true,
      tier: true,
    },
  });

  return {
    success: true,
    data: personas.map(({ token, tags, ...persona }) => ({
      ...persona,
      token: token,
      tags: tags as string[],
    })),
  };
}

export async function fetchPersonasByScoutUserChatToken({
  scoutUserChatToken,
}: {
  scoutUserChatToken: string;
}): Promise<
  ServerActionResult<
    (Pick<Persona, "id" | "name" | "source" | "prompt"> & {
      tags: string[];
    })[]
  >
> {
  const personas = await prisma.persona.findMany({
    where: {
      scoutUserChat: {
        token: scoutUserChatToken,
      },
    },
    select: {
      id: true,
      name: true,
      source: true,
      prompt: true,
      tags: true,
    },
  });
  return {
    success: true,
    data: personas.map(({ tags, ...persona }) => ({
      ...persona,
      tags: tags as string[],
    })),
  };
}

export async function userStopBackgroundStudyAction(
  studyUserChatId: number,
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    const userChat = await prisma.userChat.update({
      where: { id: studyUserChatId, userId: user.id, kind: "study" },
      data: { backgroundToken: null },
    });
    const logger = rootLogger.child({ studyUserChatId, studyUserChatToken: userChat.token });
    logger.info("Study stopped by user");
    return {
      success: true,
      data: undefined,
    };
  });
}

export async function fetchAnalystPodcastsOfStudyUserChat({
  studyUserChatToken,
}: {
  studyUserChatToken: string;
}): Promise<
  ServerActionResult<
    (Pick<
      AnalystPodcast,
      "id" | "token" | "analystId" | "script" | "generatedAt" | "createdAt" | "updatedAt"
    > & { analyst: Analyst })[]
  >
> {
  const studyUserChat = await prisma.userChat.findUnique({
    where: { token: studyUserChatToken, kind: "study" },
    include: { analyst: { select: { id: true } } },
  });
  if (!studyUserChat?.analyst) {
    return {
      success: true,
      data: [],
    };
  }
  const podcasts = await prisma.analystPodcast.findMany({
    where: {
      analystId: studyUserChat.analyst.id,
      // Include both generated and generating podcasts
      // generatedAt: { not: null },
    },
    select: {
      id: true,
      token: true,
      analystId: true,
      analyst: true,
      script: true,
      generatedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return {
    success: true,
    data: podcasts,
  };
}

export async function fetchAnalystReportsCountOfStudyUserChat({
  studyUserChatToken,
}: {
  studyUserChatToken: string;
}): Promise<ServerActionResult<number>> {
  const studyUserChat = await prisma.userChat.findUnique({
    where: { token: studyUserChatToken, kind: "study" },
    include: { analyst: { select: { id: true } } },
  });
  if (!studyUserChat?.analyst) {
    return {
      success: true,
      data: 0,
    };
  }
  const count = await prisma.analystReport.count({
    where: {
      analystId: studyUserChat.analyst.id,
      generatedAt: { not: null },
    },
  });
  return {
    success: true,
    data: count,
  };
}

export async function fetchAnalystPodcastsCountOfStudyUserChat({
  studyUserChatToken,
}: {
  studyUserChatToken: string;
}): Promise<ServerActionResult<number>> {
  const studyUserChat = await prisma.userChat.findUnique({
    where: { token: studyUserChatToken, kind: "study" },
    include: { analyst: { select: { id: true } } },
  });
  if (!studyUserChat?.analyst) {
    return {
      success: true,
      data: 0,
    };
  }
  const count = await prisma.analystPodcast.count({
    where: {
      analystId: studyUserChat.analyst.id,
      // Include both generated and generating podcasts
      // generatedAt: { not: null },
    },
  });
  return {
    success: true,
    data: count,
  };
}
