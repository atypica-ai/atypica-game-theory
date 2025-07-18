"use server";
import { convertDBMessagesToAIMessages, convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { categorizeFiles, FILE_UPLOAD_LIMITS } from "@/lib/fileUploadLimits";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { truncateForTitle } from "@/lib/textUtils";
import { createUserChat } from "@/lib/userChat/lib";
import {
  Analyst,
  AnalystInterview,
  AnalystReport,
  ChatMessageAttachment,
  Persona,
  UserChat,
  UserChatExtra,
} from "@/prisma/client";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import { AnalystKind } from "@/prisma/types";
import { generateId, Message } from "ai";

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
  extra?: Record<string, string | number>,
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

    const parts = [{ type: "text", text: content }];
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
      await tx.chatMessage.create({
        data: {
          messageId: generateId(),
          userChatId: userChat.id,
          role,
          content,
          parts: parts as InputJsonValue,
          attachments: attachments,
        },
      });
      await tx.analyst.create({
        data: {
          userId: user.id,
          studyUserChatId: userChat.id,
          brief: content, // 用户的第一条消息作为 brief
          role: "",
          topic: "",
          studySummary: "",
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

export async function createProductRnDStudyUserChat({
  role,
  content,
  attachments,
}: {
  role: "user" | "assistant";
  content: string;
  attachments?: ChatMessageAttachment[];
}): Promise<ServerActionResult<Omit<UserChat, "kind"> & { kind: "study" }>> {
  const result = await createStudyUserChat({ role, content, attachments });
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
      messages: Message[];
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

export async function fetchInterviewOfStudyUserChatByPersonaId({
  studyUserChatToken,
  analystId,
  personaId,
}: {
  studyUserChatToken: string;
  analystId: number;
  personaId: number;
}): Promise<
  ServerActionResult<
    AnalystInterview & {
      interviewUserChat: {
        token: string;
        backgroundToken: string | null;
        messages: Message[];
      } | null;
    }
  >
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
      message: "User chat not found",
    };
  }
  if (studyUserChat.analyst.id !== analystId) {
    return {
      success: false,
      message: "Something went wrong, analyst ID mismatch",
    };
  }
  const interview = await prisma.analystInterview.findUnique({
    where: {
      analystId_personaId: {
        analystId: studyUserChat.analyst.id,
        personaId,
      },
    },
    include: {
      interviewUserChat: {
        select: {
          token: true,
          backgroundToken: true,
          messages: { orderBy: { id: "asc" } },
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
  return {
    success: true,
    data: {
      ...interview,
      interviewUserChat: interview.interviewUserChat
        ? {
            ...interview.interviewUserChat,
            messages: interview.interviewUserChat.messages.map(convertDBMessageToAIMessage),
          }
        : null,
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

export async function fetchPersonasByIds({ ids }: { ids: number[] }): Promise<
  ServerActionResult<
    (Pick<Persona, "id" | "name" | "source" | "prompt"> & {
      tags: string[];
      scoutUserChatToken: string | null;
    })[]
  >
> {
  const personas = await prisma.persona.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      source: true,
      prompt: true,
      tags: true,
      scoutUserChat: {
        select: {
          token: true,
        },
      },
    },
  });
  return {
    success: true,
    data: personas.map(({ tags, scoutUserChat, ...persona }) => ({
      ...persona,
      scoutUserChatToken: scoutUserChat?.token ?? null,
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
    const studyLog = rootLogger.child({ studyUserChatId, studyUserChatToken: userChat.token });
    studyLog.info("Study stopped by user");
    return {
      success: true,
      data: undefined,
    };
  });
}

export async function fetchStudyFeedback(
  studyUserChatId: number,
): Promise<ServerActionResult<{ rating: "useful" | "not_useful"; submittedAt: string } | null>> {
  return withAuth(async (user) => {
    const userChat = await prisma.userChat.findUnique({
      where: { id: studyUserChatId, userId: user.id, kind: "study" },
      select: { extra: true },
    });

    if (!userChat) {
      return {
        success: false,
        message: "Study not found or access denied",
      };
    }

    const extra = userChat.extra as UserChatExtra;
    const feedback = extra?.feedback as
      | { rating: "useful" | "not_useful"; submittedAt: string }
      | undefined;

    return {
      success: true,
      data: feedback || null,
    };
  });
}

export async function submitStudyFeedback(
  studyUserChatId: number,
  feedback: {
    rating: "useful" | "not_useful";
  },
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    // Check if user owns this study
    const userChat = await prisma.userChat.findUnique({
      where: { id: studyUserChatId, userId: user.id, kind: "study" },
    });

    if (!userChat) {
      return {
        success: false,
        message: "Study not found or access denied",
      };
    }

    // Store feedback in database (you may need to create a feedback table)
    // For now, we'll log it and store it as metadata in the userChat
    const feedbackData = {
      rating: feedback.rating,
      submittedAt: new Date().toISOString(),
    };

    await prisma.userChat.update({
      where: { id: studyUserChatId },
      data: {
        extra: {
          ...((userChat.extra as UserChatExtra) || {}),
          feedback: feedbackData,
        },
      },
    });

    const studyLog = rootLogger.child({ studyUserChatId, studyUserChatToken: userChat.token });
    studyLog.info("Study feedback submitted", { feedback: feedbackData });

    return {
      success: true,
      data: undefined,
    };
  });
}
