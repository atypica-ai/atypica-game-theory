"use server";

import { DiscussionTimelineEvent } from "@/app/(panel)/types";
import { ServerActionResult } from "@/lib/serverAction";
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
      events: discussionTimeline.events,
      summary: discussionTimeline.summary,
      createdAt: discussionTimeline.createdAt,
    },
  };
}
