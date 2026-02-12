import "server-only";

import { rootLogger } from "@/lib/logging";
import { PersonaPanel } from "@/prisma/client";
import { DiscussionTimelineUpdateInput } from "@/prisma/generated/internal/prismaNamespace";
import { prisma } from "@/prisma/prisma";
import { Logger } from "pino";
import { DiscussionTimelineEvent } from "../types";

/**
 * Save timeline events to database
 * This is the default persistence behavior for panel discussions
 */
export async function saveTimelineEvent({
  timelineToken,
  timelineEvents,
  summary,
  minutes,
  logger,
}: {
  timelineToken: string;
  timelineEvents?: DiscussionTimelineEvent[];
  summary?: string;
  minutes?: string;
  logger: Logger;
}): Promise<void> {
  const updatePayload: DiscussionTimelineUpdateInput = {};
  if (timelineEvents) updatePayload.events = timelineEvents; // as unknown as InputJsonObject;
  if (summary) updatePayload.summary = summary;
  if (minutes) updatePayload.minutes = minutes;
  try {
    await prisma.discussionTimeline.update({
      where: { token: timelineToken },
      data: updatePayload,
    });
  } catch (error) {
    logger.error(`Error saving timeline event: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Save panel configuration to database for reuse
 * This creates a template that can be reused for similar questions
 */
export async function createPersonaPanel({
  userId,
  personaIds,
  instruction,
}: {
  userId: number;
  personaIds: number[];
  instruction?: string;
}): Promise<PersonaPanel> {
  try {
    const personaPanel = await prisma.personaPanel.create({
      data: {
        userId,
        personaIds,
        instruction,
      },
    });
    // todo: 在 after 里，生成一下 title
    rootLogger.info(`Panel config saved with id: ${personaPanel.id}`);
    return personaPanel;
  } catch (error) {
    rootLogger.error(`Error saving panel config: ${(error as Error).message}`);
    throw error;
  }
}
