"use server";
import { prisma } from "@/lib/prisma";
import { ServerActionResult } from "@/lib/serverAction";
import {
  Analyst,
  AnalystInterview,
  AnalystReport,
  UserChat as UserChatPrisma,
} from "@prisma/client";
import { Message } from "ai";

export type UserChat = Omit<UserChatPrisma, "messages"> & {
  messages: Message[];
};

export async function fetchUserChatByToken<Tkind extends UserChat["kind"]>(
  token: string,
  kind: Tkind,
): Promise<
  ServerActionResult<
    Omit<UserChat, "kind"> & {
      kind: Tkind;
    }
  >
> {
  const userChat = await prisma.userChat.findUnique({
    where: { token, kind },
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
      messages: userChat.messages as unknown as Message[],
    },
  };
}

export async function fetchUserChatStateByToken<Tkind extends UserChat["kind"]>(
  studyUserChatToken: string,
  kind: Tkind,
): Promise<ServerActionResult<{ backgroundToken: string | null; updatedAt: Date }>> {
  const userChat = await prisma.userChat.findUnique({
    where: { token: studyUserChatToken, kind },
    select: {
      backgroundToken: true,
      updatedAt: true,
    },
  });
  if (!userChat) {
    return {
      success: false,
      code: "not_found",
      message: "User chat not found",
    };
  }
  const { backgroundToken, updatedAt } = userChat;
  return {
    success: true,
    data: { backgroundToken, updatedAt },
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
  analystId,
}: {
  studyUserChatToken: string;
  analystId: number;
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
  if (studyUserChat.analyst.id !== analystId) {
    return {
      success: false,
      message: "Something went wrong, analyst ID mismatch",
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
}): Promise<ServerActionResult<Omit<AnalystInterview, "messages"> & { messages: Message[] }>> {
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
  const interview = await prisma.analystInterview.findUniqueOrThrow({
    where: {
      analystId_personaId: {
        analystId: studyUserChat.analyst.id,
        personaId,
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
      messages: interview.messages as unknown as Message[],
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
}: {
  studyUserChatToken: string;
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
      success: false,
      code: "not_found",
      message: "No analyst found on userChat",
    };
  }
  const reports = await prisma.analystReport.findMany({
    where: { analystId: studyUserChat.analyst.id },
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
    orderBy: { createdAt: "desc" },
  });
  return {
    success: true,
    data: reports,
  };
}
