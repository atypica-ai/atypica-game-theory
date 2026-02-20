"use server";
import { convertDBMessagesToAIMessages, convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { StudyToolName, TStudyMessageWithTool } from "@/app/(study)/tools/types";
import { trackEventServerSide } from "@/lib/analytics/server";
import { getS3SignedCdnUrl } from "@/lib/attachments/actions";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { truncateForTitle } from "@/lib/textUtils";
import {
  AnalystPodcast,
  AnalystPodcastExtra,
  AnalystReport,
  ChatMessageAttachment,
  Persona,
  UserChat,
  UserChatExtra,
} from "@/prisma/client";
import { AnalystInterviewWhereInput } from "@/prisma/models";
import { prismaRO } from "@/prisma/prisma";
import { FileUIPart, UIMessage } from "ai";
import { UserChatContext } from "../context/types";
import { createStudyUserChat } from "./lib";

export async function createStudyUserChatAction(
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
): Promise<ServerActionResult<Omit<UserChat, "kind"> & { kind: "study" }>> {
  return withAuth(async (user) => {
    try {
      const userChat = await createStudyUserChat({
        userId: user.id,
        role,
        content,
        attachments,
        context,
        extra,
      });

      trackEventServerSide({
        userId: user.id,
        event: "Study Session Started",
        properties: {
          userChatId: userChat.id,
          brief: truncateForTitle(content, { maxDisplayWidth: 30, suffix: "..." }),
          attachments: attachments?.length,
        },
      });

      return {
        success: true,
        data: userChat,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: errorMessage,
      };
    }
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
  const userChat = await prismaRO.userChat.findUnique({
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

export async function fetchAttachmentsInStudy({
  userChatToken,
}: {
  userChatToken: string;
}): Promise<ServerActionResult<FileUIPart[]>> {
  const studyUserChat = await prismaRO.userChat.findUnique({
    where: {
      token: userChatToken,
      // kind: "study", // 因为有 universal agent, 现在不过滤了
    },
  });
  if (!studyUserChat) {
    return {
      success: false,
      code: "not_found",
      message: "study user chat not found",
    };
  }
  const fileUIParts = await Promise.all(
    (studyUserChat.context.attachments ?? []).map(async ({ name, objectUrl, mimeType }) => {
      const url = await getS3SignedCdnUrl(objectUrl);
      return { type: "file" as const, mediaType: mimeType, filename: name, url: url };
    }),
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
export async function fetchPersonaInterviewInStudy({
  userChatToken,
  forPersonaId,
}: {
  userChatToken: string;
  forPersonaId: number;
}): Promise<
  ServerActionResult<{
    conclusion: string;
    interviewUserChat: {
      token: string;
      messages: UIMessage[];
    } | null;
    persona: {
      token: string;
      name: string;
    };
  }>
> {
  const studyUserChat = await prismaRO.userChat.findUnique({
    where: {
      token: userChatToken,
      // kind: "study", // 因为有 universal agent, 现在不过滤了
    },
  });
  // const analystId = studyUserChat?.analyst?.id;
  const personaPanelId = studyUserChat?.context?.personaPanelId;
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

  const interview = await prismaRO.analystInterview.findFirst({
    where,
    select: {
      id: true,
      conclusion: true,
      interviewUserChat: {
        select: {
          token: true,
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
  if (!persona?.token) {
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
            token: interviewUserChat.token,
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
 * 和 fetchPersonaInterviewInStudy 一样，这个方法是安全的，无法通过遍历 personaId 来获取所有 Persona
 */
export async function fetchSearchedPersonasInStudy({
  userChatToken,
  filterByPersonaIds,
}: {
  userChatToken: string;
  filterByPersonaIds?: number[];
}): Promise<
  ServerActionResult<
    (Pick<Persona, "name" | "source" | "tier" | "prompt"> & {
      token: string;
      tags: string[];
    })[]
  >
> {
  const studyUserChat = await prismaRO.userChat.findUnique({
    where: {
      token: userChatToken,
      // kind: "study", // 因为有 universal agent, 现在不过滤了
    },
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

  const personas = await prismaRO.persona.findMany({
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
  const personas = await prismaRO.persona.findMany({
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

export async function fetchAnalystReportByToken(token: string): Promise<
  ServerActionResult<
    Pick<AnalystReport, "id" | "token" | "generatedAt" | "createdAt" | "updatedAt"> & {
      coverCdnHttpUrl?: string;
    }
  >
> {
  const report = await prismaRO.analystReport.findUnique({
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
  const objectUrl = extra.coverObjectUrl;
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
  const userChat = await prismaRO.userChat.findUnique({
    where: { token: studyUserChatToken },
  });
  const reportTokens = userChat?.context?.reportTokens;
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
      const objectUrl = extra.coverObjectUrl;
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
  const userChat = await prismaRO.userChat.findUnique({
    where: { token: studyUserChatToken },
  });
  const podcastTokens = userChat?.context?.podcastTokens;
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
      extra: extra,
    })),
  };
}

export async function fetchAnalystReportsCountOfStudyUserChat({
  studyUserChatToken,
}: {
  studyUserChatToken: string;
}): Promise<ServerActionResult<number>> {
  const userChat = await prismaRO.userChat.findUnique({
    where: { token: studyUserChatToken },
  });
  return {
    success: true,
    data: userChat?.context?.reportTokens?.length ?? 0,
  };
}

export async function fetchAnalystPodcastsCountOfStudyUserChat({
  studyUserChatToken,
}: {
  studyUserChatToken: string;
}): Promise<ServerActionResult<number>> {
  const userChat = await prismaRO.userChat.findUnique({
    where: { token: studyUserChatToken },
  });
  return {
    success: true,
    data: userChat?.context?.podcastTokens?.length ?? 0,
  };
}
