"use server";
import { prisma } from "@/lib/prisma";
import { ServerActionResult } from "@/lib/serverAction";
import withAuth from "@/lib/withAuth";
import { Analyst, AnalystReport } from "@prisma/client";

export async function fetchAnalysts({ take = 30 }: { take?: number } = {}): Promise<
  ServerActionResult<Analyst[]>
> {
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
    return {
      success: true,
      data: analysts.map((analyst) => ({ ...analyst })),
    };
  });
}

export async function fetchAnalystById(analystId: number): Promise<ServerActionResult<Analyst>> {
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
    const analyst = await prisma.analyst.findUnique({
      where: { id: analystId },
    });
    if (!analyst) {
      return {
        success: false,
        code: "not_found",
        message: "Analyst not found",
      };
    }
    return {
      success: true,
      data: analyst,
    };
  });
}

export async function createAnalyst({
  role,
  topic,
}: Pick<Analyst, "role" | "topic">): Promise<ServerActionResult<Analyst>> {
  const analyst = await withAuth(async (user) => {
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
      return null;
    }
  });

  if (!analyst) {
    return {
      success: false,
      message: "Error creating analyst",
    };
  }

  return {
    success: true,
    data: analyst,
  };
}

export async function updateAnalyst(
  analystId: number,
  { role, topic }: Partial<Pick<Analyst, "role" | "topic">>,
): Promise<ServerActionResult<Analyst>> {
  const analyst = await withAuth(async (user) => {
    try {
      const userAnalyst = await prisma.userAnalyst.findUnique({
        where: { userId_analystId: { userId: user.id, analystId } },
      });
      if (!userAnalyst) return null;

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
      return null;
    }
  });

  if (!analyst) {
    return {
      success: false,
      message: "Error updating analyst or access denied",
    };
  }

  return {
    success: true,
    data: analyst,
  };
}

export async function fetchAnalystReportByToken(
  token: string,
): Promise<ServerActionResult<AnalystReport>> {
  const report = await prisma.analystReport.findUnique({
    where: { token },
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
