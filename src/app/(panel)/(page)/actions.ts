"use server";

import { runPersonaDiscussion } from "@/app/(panel)/lib";
import { DiscussionTimelineEvent } from "@/app/(panel)/types";
import { checkAdminAuth } from "@/app/admin/actions";
import { VALID_LOCALES } from "@/i18n/routing";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { detectInputLanguage } from "@/lib/textUtils";
import { generateToken } from "@/lib/utils";
import { prisma } from "@/prisma/prisma";

type Locale = (typeof VALID_LOCALES)[number];

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

    // Detect locale from instruction
    const locale = await detectInputLanguage({ text: instruction });

    // Create DiscussionTimeline record first
    const token = generateToken(32);
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
      locale: locale as Locale,
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
