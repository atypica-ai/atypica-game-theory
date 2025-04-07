"use server";
import { prisma } from "@/lib/prisma";
import { ServerActionResult } from "@/lib/serverAction";
import withAuth from "@/lib/withAuth";
import { AnalystInterview, Persona } from "@prisma/client";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { Message } from "ai";

interface PersonaWithTags extends Omit<Persona, "tags"> {
  tags: string[];
}

interface InterviewWithMessages extends Omit<AnalystInterview, "messages"> {
  messages: Message[];
}

interface InterviewWithPersona extends InterviewWithMessages {
  persona: PersonaWithTags;
}

export async function fetchAnalystInterviews(
  analystId: number,
): Promise<ServerActionResult<InterviewWithPersona[]>> {
  return withAuth(async (user) => {
    const userAnalyst = await prisma.userAnalyst.findUnique({
      where: { userId_analystId: { userId: user.id, analystId } },
    });

    if (!userAnalyst) {
      return {
        success: false,
        code: "forbidden",
        message: "User not allowed to access this analyst",
      };
    }

    const interviews = await prisma.analystInterview.findMany({
      where: { analystId },
      include: {
        persona: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      data: interviews.map((interview) => {
        const { persona, messages } = interview;
        return {
          ...interview,
          persona: {
            ...persona,
            tags: persona.tags as string[],
          },
          messages: messages as unknown as Message[],
        };
      }),
    };
  });
}

export async function fetchInterviewByAnalystAndPersona({
  analystId,
  personaId,
}: {
  analystId: number;
  personaId: number;
}): Promise<ServerActionResult<InterviewWithMessages>> {
  return withAuth(async (user) => {
    const interview = await prisma.analystInterview.findUnique({
      where: {
        analystId_personaId: { analystId, personaId },
      },
    });

    if (!interview) {
      return {
        success: false,
        code: "not_found",
        message: "Interview not found",
      };
    }

    const userAnalyst = await prisma.userAnalyst.findUnique({
      where: {
        userId_analystId: { userId: user.id, analystId: interview.analystId },
      },
    });

    if (!userAnalyst) {
      return {
        success: false,
        code: "forbidden",
        message: "User not allowed to access this interview",
      };
    }

    const { messages } = interview;
    return {
      success: true,
      data: {
        ...interview,
        messages: messages as unknown as Message[],
      },
    };
  });
}

export async function fetchAnalystInterviewById(
  interviewId: number,
): Promise<ServerActionResult<InterviewWithMessages>> {
  return withAuth(async (user) => {
    const interview = await prisma.analystInterview.findUnique({
      where: { id: interviewId },
    });

    if (!interview) {
      return {
        success: false,
        code: "not_found",
        message: "Interview not found",
      };
    }

    const userAnalyst = await prisma.userAnalyst.findUnique({
      where: {
        userId_analystId: { userId: user.id, analystId: interview.analystId },
      },
    });

    if (!userAnalyst) {
      return {
        success: false,
        code: "forbidden",
        message: "User not allowed to access this interview",
      };
    }

    const { messages } = interview;
    return {
      success: true,
      data: {
        ...interview,
        messages: messages as unknown as Message[],
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
}): Promise<ServerActionResult<InterviewWithMessages>> {
  return withAuth(async (user) => {
    const userAnalyst = await prisma.userAnalyst.findUnique({
      where: { userId_analystId: { userId: user.id, analystId } },
    });

    if (!userAnalyst) {
      return {
        success: false,
        code: "forbidden",
        message: "User not allowed to access this analyst",
      };
    }

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
        personaPrompt: "",
        interviewerPrompt: "",
        messages: [],
        conclusion: "",
      },
    });

    return {
      success: true,
      data: {
        ...interview,
        messages: interview.messages as unknown as Message[],
      },
    };
  });
}

export async function updateAnalystInterview(
  analystInterviewId: number,
  {
    messages,
    conclusion,
  }: Partial<{
    messages: Message[];
    conclusion: string;
  }>,
): Promise<ServerActionResult<InterviewWithMessages>> {
  return withAuth(async (user) => {
    // First check if user has access to this interview
    const interview = await prisma.analystInterview.findUnique({
      where: { id: analystInterviewId },
    });

    if (!interview) {
      return {
        success: false,
        code: "not_found",
        message: "Interview not found",
      };
    }

    const userAnalyst = await prisma.userAnalyst.findUnique({
      where: {
        userId_analystId: { userId: user.id, analystId: interview.analystId },
      },
    });

    if (!userAnalyst) {
      return {
        success: false,
        code: "forbidden",
        message: "User not allowed to update this interview",
      };
    }

    const updatedInterview = await prisma.analystInterview.update({
      where: { id: analystInterviewId },
      data: {
        conclusion,
        messages: messages ? (messages as unknown as InputJsonValue) : undefined,
      },
    });

    return {
      success: true,
      data: {
        ...updatedInterview,
        messages: updatedInterview.messages as unknown as Message[],
      },
    };
  });
}
