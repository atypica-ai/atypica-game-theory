"use server";
import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { StatReporter } from "@/ai/tools/types";
import { determineKindAndGeneratePodcast } from "@/app/(podcast)/lib/evaluate";
import { generatePodcast } from "@/app/(podcast)/lib/generation";
import { PodcastKind } from "@/app/(podcast)/types";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { generateChatTitle } from "@/lib/userChat/lib";
import { generateToken } from "@/lib/utils";
import {
  Analyst,
  AnalystKind,
  AnalystPodcast,
  AnalystPodcastExtra,
  AnalystReport,
  User,
  UserChat,
} from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { UIMessage } from "ai";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

// Get all analysts
export async function fetchAnalysts(
  page: number = 1,
  search?: string,
  pageSize: number = 12,
  kind?: AnalystKind | "all",
): Promise<
  ServerActionResult<
    (Analyst & {
      user: Pick<User, "email"> | null;
      studyUserChat: Pick<UserChat, "token" | "title" | "extra"> | null;
      reports: Pick<AnalystReport, "id" | "token" | "createdAt" | "generatedAt">[];
      podcasts: Pick<AnalystPodcast, "id" | "token" | "createdAt" | "generatedAt">[];
    })[]
  >
> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  const skip = (page - 1) * pageSize;

  // Build where clause
  const where: {
    topic: { not: string };
    OR?: Array<{
      topic?: { contains: string };
      brief?: { contains: string };
      user?: { email: { contains: string } };
      studyUserChat?: { token: { contains: string } };
    }>;
    kind?: AnalystKind;
  } = {
    topic: { not: "" },
  };

  // Add search filter
  if (search) {
    where.OR = [
      { topic: { contains: search } },
      { brief: { contains: search } },
      {
        user: {
          email: { contains: search },
        },
      },
      {
        studyUserChat: {
          token: { contains: search },
        },
      },
    ];
  }

  // Add kind filter
  if (kind && kind !== "all") {
    where.kind = kind;
  }

  // Step 1: Get main analyst data without nested collections
  const analysts = await prisma.analyst.findMany({
    where,
    include: {
      studyUserChat: {
        select: {
          token: true,
          title: true,
          extra: true,
        },
      },
      user: {
        select: {
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: pageSize,
  });

  const totalCount = await prisma.analyst.count({ where });

  // Extract analyst IDs for batch queries
  const analystIds = analysts.map((a) => a.id);

  // Step 2: Batch fetch reports and podcasts in parallel (2 queries instead of 2N)
  const [allReports, allPodcasts] = await Promise.all([
    prisma.analystReport.findMany({
      where: {
        analystId: { in: analystIds },
      },
      select: {
        id: true,
        token: true,
        createdAt: true,
        generatedAt: true,
        analystId: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.analystPodcast.findMany({
      where: {
        analystId: { in: analystIds },
      },
      select: {
        id: true,
        token: true,
        createdAt: true,
        generatedAt: true,
        analystId: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Step 3: Group data by analystId for O(1) lookup
  const reportsMap = new Map<
    number,
    Pick<AnalystReport, "id" | "token" | "createdAt" | "generatedAt">[]
  >();
  const podcastsMap = new Map<
    number,
    Pick<AnalystPodcast, "id" | "token" | "createdAt" | "generatedAt">[]
  >();

  allReports.forEach((report) => {
    const { analystId, ...reportData } = report;
    if (!reportsMap.has(analystId)) {
      reportsMap.set(analystId, []);
    }
    reportsMap.get(analystId)!.push(reportData);
  });

  allPodcasts.forEach((podcast) => {
    const { analystId, ...podcastData } = podcast;
    if (!podcastsMap.has(analystId)) {
      podcastsMap.set(analystId, []);
    }
    podcastsMap.get(analystId)!.push(podcastData);
  });

  // Step 4: Combine data
  return {
    success: true,
    data: analysts.map((analyst) => ({
      ...analyst,
      reports: reportsMap.get(analyst.id) || [],
      podcasts: podcastsMap.get(analyst.id) || [],
    })),
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

export async function generateChatTitleAction(
  userChatId: number,
): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  after(generateChatTitle(userChatId));

  return {
    success: true,
    data: undefined,
  };
}

// Fetch brief chat messages by chat ID
export async function fetchBriefChatMessages(
  briefUserChatId: number,
): Promise<ServerActionResult<UIMessage[]>> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  const briefChat = await prisma.userChat.findUnique({
    where: { id: briefUserChatId },
    include: {
      messages: {
        orderBy: { id: "asc" },
      },
    },
  });

  if (!briefChat) {
    return {
      success: false,
      message: "Brief chat not found",
    };
  }

  return {
    success: true,
    data: briefChat.messages.map(convertDBMessageToAIMessage),
  };
}

// Admin version of generatePodcastAction - bypasses user ownership check
export async function determineKindAndGeneratePodcastAdminAction({
  analystId,
  systemPrompt,
  podcastKind,
}: {
  analystId: number;
  systemPrompt?: string;
  podcastKind: "auto" | PodcastKind;
}): Promise<void> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  // Get the analyst (no user ownership check needed for admin)
  const analyst = await prisma.analyst.findUnique({
    where: { id: analystId },
  });

  if (!analyst) {
    throw new Error("Analyst not found");
  }

  const statReport: StatReporter = (async (dimension, value, extra) => {
    rootLogger.info({
      msg: `[LIMITED FREE] statReport: ${dimension}=${value}`,
      extra,
      analystId: analystId,
      note: "Podcast generation is currently free - tokens not deducted",
    });
  }) as StatReporter;

  const abortSignal = new AbortController().signal;

  // Start podcast generation in background
  if (podcastKind === "auto") {
    // Auto-determine podcast kind
    waitUntil(
      determineKindAndGeneratePodcast({
        analystId: analystId,
        abortSignal,
        statReport,
      }),
    );
  } else {
    const podcast = await prisma.analystPodcast
      .create({
        data: {
          analystId,
          token: generateToken(),
          instruction: "",
          script: "",
          extra: {
            kindDetermination: {
              kind: podcastKind,
              reason: "Manual selection",
              systemPrompt,
            },
          } as AnalystPodcastExtra,
        },
      })
      .then(({ extra, ...analyst }) => ({
        ...analyst,
        extra: extra as AnalystPodcastExtra,
      }));

    // Manual podcast kind selection
    waitUntil(
      generatePodcast({
        podcast,
        abortSignal,
        statReport,
      }),
    );
  }

  revalidatePath("/admin/studies");
}
