"use server";
import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { AnalystInterview, Persona } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { Message } from "ai";

interface PersonaWithTags extends Omit<Persona, "tags"> {
  tags: string[];
}

export async function fetchAnalystInterviews(analystId: number): Promise<
  ServerActionResult<
    (AnalystInterview & {
      persona: PersonaWithTags;
      interviewUserChat: {
        id: number;
        token: string;
        backgroundToken: string | null;
      } | null;
    })[]
  >
> {
  return withAuth(async (user) => {
    await prisma.analyst.findUniqueOrThrow({
      where: {
        id: analystId,
        userId: user.id, // ensure user owns the analyst
      },
    });
    const interviews = await prisma.analystInterview.findMany({
      where: { analystId },
      include: {
        persona: true,
        interviewUserChat: {
          select: {
            id: true,
            token: true,
            backgroundToken: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      data: interviews.map((interview) => {
        const { persona } = interview;
        return {
          ...interview,
          persona: {
            ...persona,
            tags: persona.tags as string[],
          },
        };
      }),
    };
  });
}

export async function fetchAnalystInterviewById(interviewId: number): Promise<
  ServerActionResult<
    AnalystInterview & {
      persona: PersonaWithTags;
      interviewUserChat: {
        token: string;
        backgroundToken: string | null;
        messages: Message[];
      } | null;
    }
  >
> {
  return withAuth(async (user) => {
    const interview = await prisma.analystInterview.findUnique({
      where: { id: interviewId },
      include: {
        persona: true,
        analyst: { select: { userId: true } },
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
        message: "Interview not found",
      };
    }

    if (interview.analyst.userId !== user.id) {
      return {
        success: false,
        code: "forbidden",
        message: "User not allowed to access this interview",
      };
    }

    return {
      success: true,
      data: {
        ...interview,
        persona: {
          ...interview.persona,
          tags: interview.persona.tags as string[],
        },
        interviewUserChat: interview.interviewUserChat
          ? {
              ...interview.interviewUserChat,
              messages: interview.interviewUserChat.messages.map(convertDBMessageToAIMessage),
            }
          : null,
      },
    };
  });
}

export async function upsertAnalystInterview({
  analystId,
  personaId,
}: {
  analystId: number;
  personaId: number;
}): Promise<ServerActionResult<AnalystInterview>> {
  return withAuth(async (user) => {
    await prisma.analyst.findUniqueOrThrow({
      where: {
        id: analystId,
        userId: user.id, // ensure user owns the analyst
      },
    });
    const interview = await prisma.analystInterview.upsert({
      where: {
        analystId_personaId: {
          analystId,
          personaId,
        },
      },
      update: {},
      create: {
        analystId,
        personaId,
        instruction: "",
        conclusion: "",
      },
    });

    return {
      success: true,
      data: {
        ...interview,
      },
    };
  });
}
