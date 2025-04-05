"use server";
import { prisma } from "@/lib/prisma";
import { UserChat as UserChatPrisma } from "@prisma/client";
import { Message } from "ai";
import { notFound } from "next/navigation";

export type UserChat = Omit<UserChatPrisma, "messages"> & {
  messages: Message[];
};

export async function fetchUserChatByToken<Tkind extends UserChat["kind"]>(
  token: string,
  kind: Tkind,
): Promise<
  Omit<UserChat, "kind"> & {
    kind: Tkind;
  }
> {
  try {
    const userChat = await prisma.userChat.findUnique({
      where: { token, kind },
    });
    if (!userChat) notFound();
    return {
      ...userChat,
      kind: userChat.kind as Tkind,
      messages: userChat.messages as unknown as Message[],
    };
  } catch (error) {
    console.log("Error fetching user chat:", error);
    throw error;
  }
}

export async function fetchUserChatStateByToken<Tkind extends UserChat["kind"]>(
  studyUserChatToken: string,
  kind: Tkind,
) {
  try {
    const { backgroundToken, updatedAt } = await prisma.userChat.findUniqueOrThrow({
      where: { token: studyUserChatToken, kind },
      select: {
        backgroundToken: true,
        updatedAt: true,
      },
    });
    return { backgroundToken, updatedAt };
  } catch (error) {
    console.log("Error fetching user chat status:", error);
    throw error;
  }
}

export async function fetchStatsByStudyUserChatToken(studyUserChatToken: string) {
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

  return result.map((item) => ({
    dimension: item.dimension,
    total: item._sum.value,
  }));
}

export async function fetchAnalystByStudyUserChatToken({
  studyUserChatToken,
  analystId,
}: {
  studyUserChatToken: string;
  analystId: number;
}) {
  try {
    const studyUserChat = await prisma.userChat.findUnique({
      where: { token: studyUserChatToken, kind: "study" },
      include: {
        analyst: true,
      },
    });
    if (!studyUserChat?.analyst) notFound();
    if (studyUserChat.analyst.id !== analystId) {
      throw new Error("Something went wrong, analyst ID mismatch");
    }
    return { ...studyUserChat.analyst };
  } catch (error) {
    console.log("Error fetching analyst:", error);
    throw error;
  }
}

export async function fetchInterviewOfStudyUserChatByPersonaId({
  studyUserChatToken,
  analystId,
  personaId,
}: {
  studyUserChatToken: string;
  analystId: number;
  personaId: number;
}) {
  try {
    const studyUserChat = await prisma.userChat.findUnique({
      where: { token: studyUserChatToken, kind: "study" },
      include: {
        analyst: {
          select: { id: true },
        },
      },
    });
    if (!studyUserChat?.analyst) notFound();
    if (studyUserChat.analyst.id !== analystId) {
      throw new Error("Something went wrong, analyst ID mismatch");
    }
    const interview = await prisma.analystInterview.findUniqueOrThrow({
      where: {
        analystId_personaId: {
          analystId: studyUserChat.analyst.id,
          personaId,
        },
      },
    });
    if (!interview) notFound();
    return {
      ...interview,
      messages: interview.messages as unknown as Message[],
    };
  } catch (error) {
    console.log("Error fetching interview of study user chat:", error);
    throw error;
  }
}

export async function fetchAnalystReportByToken(token: string) {
  const report = await prisma.analystReport.findUnique({
    where: { token },
  });
  if (!report) notFound();
  return report;
}

// export async function fetchPendingReportByAnalystId(analystId: number) {
//   const report = await prisma.analystReport.findFirst({
//     where: {
//       analystId,
//       generatedAt: null,
//     },
//     orderBy: {
//       createdAt: "desc",
//     },
//   });
//   if (!report) notFound();
//   return report;
// }
