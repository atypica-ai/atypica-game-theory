"use server";
import { prisma } from "@/lib/prisma";
import withAuth from "@/lib/withAuth";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { Message } from "ai";
import { forbidden, notFound } from "next/navigation";

export async function fetchAnalystInterviews(analystId: number) {
  return withAuth(async (user) => {
    const userAnalyst = await prisma.userAnalyst.findUnique({
      where: { userId_analystId: { userId: user.id, analystId } },
    });
    if (!userAnalyst) forbidden();
    const interviews = await prisma.analystInterview.findMany({
      where: { analystId },
      include: {
        persona: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return interviews.map((interview) => {
      const { persona, messages } = interview;
      return {
        ...interview,
        persona: {
          ...persona,
          tags: persona.tags as string[],
        },
        messages: messages as unknown as Message[],
      };
    });
  });
}

export async function fetchInterviewByAnalystAndPersona({
  analystId,
  personaId,
}: {
  analystId: number;
  personaId: number;
}) {
  return withAuth(async (user) => {
    try {
      const interview = await prisma.analystInterview.findUniqueOrThrow({
        where: {
          analystId_personaId: { analystId, personaId },
        },
      });
      if (!interview) notFound();
      const userAnalyst = await prisma.userAnalyst.findUnique({
        where: {
          userId_analystId: { userId: user.id, analystId: interview.analystId },
        },
      });
      if (!userAnalyst) forbidden();
      const { messages } = interview;
      return {
        ...interview,
        messages: messages as unknown as Message[],
      };
    } catch (error) {
      console.log("Error fetching analyst interview", error);
      throw error;
    }
  });
}

export async function fetchAnalystInterviewById(interviewId: number) {
  return withAuth(async (user) => {
    try {
      const interview = await prisma.analystInterview.findUnique({
        where: { id: interviewId },
      });
      if (!interview) notFound();
      const userAnalyst = await prisma.userAnalyst.findUnique({
        where: {
          userId_analystId: { userId: user.id, analystId: interview.analystId },
        },
      });
      if (!userAnalyst) forbidden();
      const { messages } = interview;
      return {
        ...interview,
        messages: messages as unknown as Message[],
      };
    } catch (error) {
      console.log("Error fetching analyst interview", error);
      throw error;
    }
  });
}

export async function upsertAnalystInterview({
  analystId,
  personaId,
}: {
  analystId: number;
  personaId: number;
}) {
  return withAuth(async (user) => {
    try {
      const userAnalyst = await prisma.userAnalyst.findUnique({
        where: { userId_analystId: { userId: user.id, analystId } },
      });
      if (!userAnalyst) forbidden();
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
        ...interview,
        messages: interview.messages as unknown as Message[],
      };
    } catch (error) {
      console.log("Interview already exists", error);
      throw error;
    }
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
) {
  try {
    const updatedInterview = await prisma.analystInterview.update({
      where: { id: analystInterviewId },
      data: {
        conclusion,
        messages: messages ? (messages as unknown as InputJsonValue) : undefined,
      },
    });
    return {
      ...updatedInterview,
      messages: updatedInterview.messages as unknown as Message[],
    };
  } catch (error) {
    console.log("Failed to update interview", error);
    throw error;
  }
}
