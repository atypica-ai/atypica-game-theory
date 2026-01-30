"use server";
import {
  convertDBMessagesToAIMessages,
  convertDBMessageToAIMessage,
  persistentAIMessageToDB,
} from "@/ai/messageUtils";
import { StudyToolName, TStudyMessageWithTool } from "@/app/(study)/tools/types";
import { trackEventServerSide } from "@/lib/analytics/server";
import { getS3SignedCdnUrl } from "@/lib/attachments/actions";
import { categorizeFiles, FILE_UPLOAD_LIMITS } from "@/lib/fileUploadLimits";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { detectInputLanguage, truncateForTitle } from "@/lib/textUtils";
import { createUserChat, generateChatTitle } from "@/lib/userChat/lib";
import {
  Analyst,
  AnalystPodcast,
  AnalystPodcastExtra,
  AnalystReport,
  AnalystReportExtra,
  ChatMessageAttachment,
  Persona,
  UserChat,
  UserChatExtra,
} from "@/prisma/client";
import { AnalystInterviewWhereInput } from "@/prisma/models";
import { prisma, prismaRO } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { FileUIPart, generateId, UIMessage } from "ai";
import { UserChatContext } from "../context/types";

export async function createStudyUserChat(
  {
    role,
    content,
    attachments,
    context,
  }: {
    role: "user" | "assistant";
    content: string;
    attachments?: ChatMessageAttachment[];
    context?: UserChatContext;
  },
  // 任何额外要存储的信息
  extra?: UserChatExtra,
  // // 其他的研究类型也通过这个方法统一创建
  // studyType: "general" | "product-rnd" | "fast-insight" = "general",
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
        extra,
        context,
        tx,
      });
      await persistentAIMessageToDB({
        mode: "append",
        userChatId: userChat.id,
        message: {
          id: generateId(),
          role,
          parts: [{ type: "text", text: content }],
        },
        // attachments, // attachments 只保存在 analyst 上，然后在 baseAgentRequest 中提前处理好了以后，插入 messages 中
        tx,
      });
      await tx.analyst.create({
        data: {
          userId: user.id,
          studyUserChatId: userChat.id,
          // kind:
          //   studyType === "product-rnd"
          //     ? AnalystKind.productRnD
          //     : studyType === "fast-insight"
          //       ? AnalystKind.fastInsight
          //       : null,
          // 现在不再是提前选择研究类型了，所以一开始都是 null
          kind: null,
          brief: content, // 用户的第一条消息作为 brief
          locale,
          role: "",
          topic: "",
          studySummary: "",
          studyLog: "",
          attachments: attachments,
        },
      });
      // 这样不行，因为是在 tx 里，mergeUserChatContext 里用了 prisma, 执行的时候这里 tx 还没结束，所以啥也没更新
      // if (context) {
      //   await mergeUserChatContext({
      //     id: userChat.id,
      //     context,
      //   });
      // }
      return userChat;
    });

    trackEventServerSide({
      userId: user.id,
      event: "Study Session Started",
      properties: {
        // studyType,
        userChatId: userChat.id,
        brief: truncateForTitle(content, { maxDisplayWidth: 30, suffix: "..." }),
        // interview: !!extra?.briefUserChatId,
        attachments: attachments?.length,
        // references: extra?.referenceUserChats?.length,
      },
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
  const result = await prismaRO.chatStatistics.groupBy({
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
    data: studyUserChat.analyst,
  };
}

export async function fetchAttachmentsByStudyUserChatToken({
  studyUserChatToken,
}: {
  studyUserChatToken: string;
}): Promise<ServerActionResult<FileUIPart[]>> {
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
  const fileUIParts = await Promise.all(
    (studyUserChat.analyst.attachments as ChatMessageAttachment[]).map(
      async ({ name, objectUrl, mimeType }) => {
        const url = await getS3SignedCdnUrl(objectUrl);
        return { type: "file" as const, mediaType: mimeType, filename: name, url: url };
      },
    ),
  );
  return {
    success: true,
    data: fileUIParts,
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
  });
  // const analystId = studyUserChat?.analyst?.id;
  const personaPanelId = (studyUserChat?.context as UserChatContext | undefined)
    ?.interviewPersonaPanelId;
  if (!personaPanelId) {
    return {
      success: false,
      code: "not_found",
      message: "Persona panel is missing",
    };
  }
  const where: AnalystInterviewWhereInput = {
    personaId: forPersonaId,
    personaPanelId,
    // OR: [
    //   ...(analystId ? [{ analystId }] : []), // legacy
    //   ...(personaPanelId ? [{ personaPanelId }] : []), // new
    // ],
  };

  const interview = await prisma.analystInterview.findFirst({
    where,
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
      if (
        part.type === `tool-${StudyToolName.searchPersonas}` &&
        part.state === "output-available"
      ) {
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

export async function fetchAnalystReportByToken(token: string): Promise<
  ServerActionResult<
    Pick<AnalystReport, "id" | "token" | "generatedAt" | "createdAt" | "updatedAt"> & {
      coverCdnHttpUrl?: string;
    }
  >
> {
  const report = await prisma.analystReport.findUnique({
    where: { token },
    select: {
      id: true,
      token: true,
      extra: true,
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

  const { extra, ...rest } = report;
  const objectUrl = (extra as AnalystReportExtra).coverObjectUrl;
  const coverCdnHttpUrl = objectUrl ? await getS3SignedCdnUrl(objectUrl) : undefined;

  return {
    success: true,
    data: {
      ...rest,
      coverCdnHttpUrl,
    },
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
    (Pick<AnalystReport, "id" | "token" | "generatedAt" | "createdAt" | "updatedAt"> & {
      coverCdnHttpUrl?: string;
    })[]
  >
> {
  const userChat = await prisma.userChat.findUnique({
    where: { token: studyUserChatToken },
  });
  const reportTokens = (userChat?.context as UserChatContext | undefined)?.reportTokens;
  if (!reportTokens) {
    return {
      success: false,
      message: "User chat not found or reportTokens context is missing",
    };
  }
  const reports = await prismaRO.analystReport.findMany({
    where: {
      token: { in: reportTokens },
      generatedAt: { not: null },
    },
    select: {
      id: true,
      token: true,
      extra: true,
      generatedAt: true,
      createdAt: true,
      updatedAt: true,
      onePageHtml: includeOnePageHtml,
    },
    orderBy: { id: "desc" },
  });

  const reportsWithCoverUrls = await Promise.all(
    reports.map(async (report) => {
      const { extra, ...rest } = report;
      const objectUrl = (extra as AnalystReportExtra).coverObjectUrl;
      if (objectUrl) {
        const coverCdnHttpUrl = await getS3SignedCdnUrl(objectUrl);
        return { ...rest, coverCdnHttpUrl };
      } else {
        return { ...rest, coverCdnHttpUrl: undefined };
      }
    }),
  );

  return {
    success: true,
    data: reportsWithCoverUrls,
  };
}

export async function fetchAnalystPodcastsOfStudyUserChat({
  studyUserChatToken,
}: {
  studyUserChatToken: string;
}): Promise<
  ServerActionResult<
    (Pick<AnalystPodcast, "id" | "token" | "script" | "generatedAt" | "createdAt" | "updatedAt"> & {
      extra: AnalystPodcastExtra;
    })[]
  >
> {
  const userChat = await prisma.userChat.findUnique({
    where: { token: studyUserChatToken },
  });
  const podcastTokens = (userChat?.context as UserChatContext | undefined)?.podcastTokens;
  if (!podcastTokens) {
    return {
      success: false,
      message: "User chat not found or podcastTokens context is missing",
    };
  }
  const podcasts = await prismaRO.analystPodcast.findMany({
    where: {
      token: { in: podcastTokens },
      // Include both generated and generating podcasts
      // generatedAt: { not: null },
    },
    select: {
      id: true,
      token: true,
      script: true,
      generatedAt: true,
      createdAt: true,
      updatedAt: true,
      extra: true,
    },
    orderBy: { id: "desc" },
  });
  return {
    success: true,
    data: podcasts.map(({ extra, ...podcast }) => ({
      ...podcast,
      extra: extra as AnalystPodcastExtra,
    })),
  };
}

export async function fetchAnalystReportsCountOfStudyUserChat({
  studyUserChatToken,
}: {
  studyUserChatToken: string;
}): Promise<ServerActionResult<number>> {
  const userChat = await prisma.userChat.findUnique({
    where: { token: studyUserChatToken },
  });
  return {
    success: true,
    data: (userChat?.context as UserChatContext | undefined)?.reportTokens?.length ?? 0,
  };
}

export async function fetchAnalystPodcastsCountOfStudyUserChat({
  studyUserChatToken,
}: {
  studyUserChatToken: string;
}): Promise<ServerActionResult<number>> {
  const userChat = await prisma.userChat.findUnique({
    where: { token: studyUserChatToken },
  });
  return {
    success: true,
    data: (userChat?.context as UserChatContext | undefined)?.podcastTokens?.length ?? 0,
  };
}

/**
 * Save analyst from plan mode
 *
 * Called by frontend after user confirms the research plan.
 * Updates analyst record with locale, kind, role, and topic from the plan.
 */
export async function saveAnalystFromPlan({
  userChatToken,
  locale,
  kind,
  role,
  topic,
}: {
  userChatToken: string;
  locale: "zh-CN" | "en-US" | "misc";
  kind: "productRnD" | "fastInsight" | "testing" | "insights" | "creation" | "planning" | "misc";
  role: string;
  topic: string;
}): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    try {
      // Find the userChat and verify ownership
      const userChat = await prisma.userChat.findUnique({
        where: {
          token: userChatToken,
          kind: "study",
          userId: user.id,
        },
        select: {
          id: true,
          analyst: {
            select: { id: true },
          },
        },
      });

      if (!userChat || !userChat.analyst) {
        return {
          success: false,
          code: "not_found",
          message: "Study session or analyst not found",
        };
      }

      // 见 baseAgentRequest 的 onStepFinish 方法里的描述
      waitUntil(generateChatTitle(userChat.id));

      // Update analyst with plan data
      await prisma.analyst.update({
        where: { id: userChat.analyst.id },
        data: {
          locale,
          kind,
          role,
          topic,
        },
      });

      const logger = rootLogger.child({
        userChatToken,
        userId: user.id,
        analystId: userChat.analyst.id,
      });

      logger.info({
        msg: "Analyst saved from plan",
        kind,
        role,
        locale,
        topicPreview: topic.substring(0, 150),
      });

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      const logger = rootLogger.child({ userChatToken, userId: user.id });
      logger.error({ msg: "Failed to save analyst from plan", error });
      return {
        success: false,
        message: "Failed to save research plan",
        code: "internal_server_error",
      };
    }
  });
}
