"use server";
import withAuth from "@/data/withAuth";
import { prisma } from "@/lib/prisma";
import { Analyst } from "@prisma/client";
import { forbidden, notFound } from "next/navigation";

export async function fetchAnalysts({ take = 30 }: { take?: number } = {}) {
  return withAuth(async (user) => {
    const analysts = await prisma.analyst.findMany({
      where: {
        userAnalysts: {
          some: {
            userId: user.id,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take,
    });
    return analysts.map((analyst) => {
      return { ...analyst };
    });
  });
}

export async function fetchAnalystById(analystId: number): Promise<Analyst> {
  return withAuth(async (user) => {
    try {
      const userAnalyst = await prisma.userAnalyst.findUnique({
        where: { userId_analystId: { userId: user.id, analystId } },
      });
      if (!userAnalyst) forbidden();
      const analyst = await prisma.analyst.findUnique({
        where: { id: analystId },
      });
      if (!analyst) notFound();
      return { ...analyst };
    } catch (error) {
      console.log("Error fetching analyst:", error);
      throw error;
    }
  });
}

export async function createAnalyst({
  role,
  topic,
}: Pick<Analyst, "role" | "topic">): Promise<Analyst> {
  return withAuth(async (user) => {
    try {
      const analyst = await prisma.analyst.create({
        // Empty report for new analysts
        data: { role, topic, studySummary: "" },
      });
      await prisma.userAnalyst.create({
        data: {
          userId: user.id,
          analystId: analyst.id,
        },
      });
      return analyst;
    } catch (error) {
      console.log("Error creating analyst:", error);
      throw error;
    }
  });
}

export async function updateAnalyst(
  analystId: number,
  { role, topic }: Partial<Pick<Analyst, "role" | "topic">>,
): Promise<Analyst> {
  return withAuth(async (user) => {
    try {
      const userAnalyst = await prisma.userAnalyst.findUnique({
        where: { userId_analystId: { userId: user.id, analystId } },
      });
      if (!userAnalyst) forbidden();
      const data: Partial<Pick<Analyst, "role" | "topic">> = {};
      if (typeof role !== "undefined") data.role = role;
      if (typeof topic !== "undefined") data.topic = topic;
      const analyst = await prisma.analyst.update({
        where: { id: analystId },
        data,
      });
      return analyst;
    } catch (error) {
      console.log("Error updating analyst:", error);
      throw error;
    }
  });
}

export async function fetchAnalystReportByToken(token: string) {
  const report = await prisma.analystReport.findUnique({
    where: {
      token,
    },
  });
  if (!report) notFound();
  return report;
}
