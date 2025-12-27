"use server";

import { StatReporter } from "@/ai/tools/types";
import { runPersonaDiscussion } from "@/app/(panel)/lib";
import { DiscussionTimelineEvent } from "@/app/(panel)/types";
import { checkAdminAuth } from "@/app/admin/actions";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { detectInputLanguage } from "@/lib/textUtils";
import { generateToken } from "@/lib/utils";
import { prisma } from "@/prisma/prisma";

export async function fetchDiscussionTimeline(timelineToken: string): Promise<
  ServerActionResult<{
    token: string;
    events: DiscussionTimelineEvent[];
    summary: string;
    createdAt: Date;
  }>
> {
  const discussionTimeline = await prisma.discussionTimeline.findUnique({
    where: { token: timelineToken },
  });

  if (!discussionTimeline) {
    return { success: false as const, message: "Panel timeline not found" };
  }

  return {
    success: true as const,
    data: {
      token: discussionTimeline.token,
      events: discussionTimeline.events as DiscussionTimelineEvent[],
      summary: discussionTimeline.summary,
      createdAt: discussionTimeline.createdAt,
    },
  };
}

export async function fetchPersonaIdsByTokens(personaTokens: string[]) {
  try {
    await checkAdminAuth([]);

    const personas = await prisma.persona.findMany({
      where: { token: { in: personaTokens } },
      select: { id: true },
    });

    return {
      success: true as const,
      data: personas.map((p) => p.id),
    };
  } catch (error) {
    return {
      success: false as const,
      error: (error as Error).message,
    };
  }
}

export async function startPersonaDiscussionAction({
  instruction,
  personaIds,
}: {
  instruction: string;
  personaIds: number[];
}) {
  try {
    const user = await checkAdminAuth([]);
    const statReport: StatReporter = async (dimension, value, extra) => {
      console.log(
        `Mock StatReport, dimension: ${dimension}, value: ${value}, extra: ${JSON.stringify(extra)}`,
      );
    };
    const abortSignal = new AbortController().signal;

    // Detect locale from instruction
    const locale = await detectInputLanguage({ text: instruction });

    // Create DiscussionTimeline record first
    const token = generateToken();
    await prisma.discussionTimeline.create({
      data: {
        token,
        instruction,
        events: [],
        summary: "",
        minutes: "",
      },
    });

    // Start panel discussion in background (don't await - let it run async)
    const logger = rootLogger.child({ timelineToken: token });
    runPersonaDiscussion({
      userId: user.id,
      instruction,
      personaIds,
      timelineToken: token,
      locale,
      abortSignal,
      statReport,
      logger,
    }).catch((error) => {
      logger.error(`Panel discussion error: ${(error as Error).message}`);
    });

    return {
      success: true as const,
      data: { timelineToken: token },
    };
  } catch (error) {
    return {
      success: false as const,
      error: (error as Error).message,
    };
  }
}
