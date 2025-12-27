import "server-only";

import { personaAgentSystem } from "@/ai/prompt/personaAgent";
import { buildDiscussionType } from "@/app/(panel)//discussionTypes/buildDiscussionType";
import { DiscussionTimelineEvent, PersonaSession } from "@/app/(panel)//types";
import { DiscussionTypeConfig } from "@/app/(panel)/discussionTypes";
import { DiscussionTimelineExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { generatePersonaReply, generateSummaryAndMinutes } from "./generation";
import { savePersonaPanel, saveTimelineEvent } from "./persistence";
import { selectNextSpeakerModerator } from "./speaker-selection";

const MAX_DISCUSSION_ROUNDS = 20; // Temporary

/**
 * Initialize panel discussion
 * Loads personas and creates initial timeline
 */
async function initializeDiscussionTimeline({
  question,
  personaIds,
  timelineToken,
  locale,
  logger,
}: {
  question: string;
  personaIds: number[];
  timelineToken: string;
  locale: Locale;
  logger: Logger;
}): Promise<{ timelineEvents: DiscussionTimelineEvent[]; personaSessions: PersonaSession[] }> {
  // Load personas
  const personas = await prisma.persona.findMany({
    where: { id: { in: personaIds } },
  });

  if (personas.length !== personaIds.length) {
    throw new Error("Some personas not found");
  }

  // Initialize timeline
  const timelineEvents: DiscussionTimelineEvent[] = [
    { type: "question", content: question, author: "user" },
  ];

  // Save initial question to database
  await saveTimelineEvent({
    timelineToken,
    timelineEvents,
    summary: "",
    minutes: "",
    logger,
  });

  // Initialize persona sessions - only store system prompt
  const personaSessions: PersonaSession[] = personas.map((persona) => ({
    personaId: persona.id,
    personaName: persona.name,
    systemPrompt: personaAgentSystem({ persona, locale }),
  }));

  return { timelineEvents, personaSessions };
}

/**
 * Execute a single discussion round
 * Selects speaker, generates reply, and updates timeline
 */
async function executeDiscussionRound({
  personaSessions,
  timelineEvents,
  timelineToken,
  discussionTypeConfig,
  locale,
  abortSignal,
  logger,
}: {
  personaSessions: PersonaSession[];
  timelineEvents: DiscussionTimelineEvent[];
  timelineToken: string;
  discussionTypeConfig: DiscussionTypeConfig;
  locale: Locale;
  abortSignal?: AbortSignal;
  logger: Logger;
}): Promise<{ updatedTimeline: DiscussionTimelineEvent[]; spokenPersonaId: number }> {
  // Create a new timeline array to avoid mutation issues
  const updatedTimelineEvents: DiscussionTimelineEvent[] = [...timelineEvents];

  // Select next speaker using moderator strategy
  const selection = await selectNextSpeakerModerator(
    personaSessions,
    updatedTimelineEvents,
    locale,
    discussionTypeConfig.moderatorSystem,
  );

  // Record moderator selection with reason
  updatedTimelineEvents.push({
    type: "moderator-selection",
    selectedPersonaId: selection.session.personaId,
    selectedPersonaName: selection.session.personaName,
    reasoning: selection.reason,
  });

  // Add moderator's follow-up question to timeline (steering the discussion)
  updatedTimelineEvents.push({
    type: "question",
    content: selection.nextQuestion,
    author: "moderator", // Distinguish moderator questions from initial user question
  });

  // Save moderator selection and new question to database
  await saveTimelineEvent({
    timelineToken,
    timelineEvents: updatedTimelineEvents,
    logger,
  });

  // Generate persona reply
  const replyContent = await generatePersonaReply({
    personaSession: selection.session,
    timelineEvents: updatedTimelineEvents,
    nextQuestion: selection.nextQuestion,
    discussionTypeConfig,
    locale,
    abortSignal,
  });

  if (replyContent) {
    // Add to timeline - this is the single source of truth
    updatedTimelineEvents.push({
      type: "persona-reply",
      personaId: selection.session.personaId,
      personaName: selection.session.personaName,
      content: replyContent,
    });

    // Save timeline update to database
    await saveTimelineEvent({
      timelineToken,
      timelineEvents: updatedTimelineEvents,
      logger,
    });

    return { updatedTimeline: updatedTimelineEvents, spokenPersonaId: selection.session.personaId };
  }

  return { updatedTimeline: updatedTimelineEvents, spokenPersonaId: selection.session.personaId };
}

/**
 * Main function to run panel discussion
 * Automatically saves timeline events to database as they are generated
 *
 * @param instruction User instruction that may include both question and discussion type requirements
 */
export async function runPersonaDiscussion({
  userId,
  maxRounds = MAX_DISCUSSION_ROUNDS,
  instruction,
  personaIds,
  timelineToken,
  locale,
  abortSignal,
  logger,
}: {
  userId: number;
  maxRounds?: number;
  instruction: string;
  personaIds: number[];
  timelineToken: string;
  locale: Locale;
  abortSignal?: AbortSignal;
  logger: Logger;
}): Promise<{ timelineEvents: DiscussionTimelineEvent[]; summary: string }> {
  // Build custom discussion type configuration from instruction
  logger.info("Building custom discussion type from instruction");
  const discussionTypeConfig = await buildDiscussionType({
    instruction,
    locale,
    abortSignal,
  });

  // Extract moderatorSystem from discussionTypeConfig for storage
  const moderatorSystem = discussionTypeConfig.moderatorSystem({ locale });

  // Save PersonaPanel to database for reuse
  const personaPanelId = await savePersonaPanel({
    userId,
    personaIds,
    logger,
  });

  // Link DiscussionTimeline to PersonaPanel
  const updatedTimeline = await prisma.discussionTimeline.update({
    where: { token: timelineToken },
    data: { personaPanelId },
  });
  // 用 mergeExtra 避免覆盖 extra 其他字段
  await mergeExtra({
    tableName: "DiscussionTimeline",
    id: updatedTimeline.id,
    extra: {
      moderatorSystem,
    } satisfies DiscussionTimelineExtra,
  });

  // Initialize panel discussion
  const { timelineEvents, personaSessions } = await initializeDiscussionTimeline({
    question: instruction,
    personaIds,
    timelineToken,
    locale,
    logger,
  });

  // Run discussion for maxRounds rounds
  // Ensure all personas speak at least once, then continue until maxRounds
  const spokenPersonaIds = new Set<number>();
  let round = 0;

  // Continue until maxRounds, but ensure all personas speak at least once
  while (round < maxRounds) {
    if (abortSignal?.aborted) {
      throw new Error("Panel discussion aborted");
    }

    const { updatedTimeline, spokenPersonaId } = await executeDiscussionRound({
      personaSessions,
      timelineEvents,
      timelineToken,
      discussionTypeConfig,
      locale,
      abortSignal,
      logger,
    });

    // Update timeline reference (replace contents)
    timelineEvents.splice(0, timelineEvents.length, ...updatedTimeline);

    spokenPersonaIds.add(spokenPersonaId);
    round++;
  }

  // Generate moderator summary and minutes in parallel
  const { summary, minutes } = await generateSummaryAndMinutes({
    timelineEvents,
    discussionTypeConfig,
    locale,
    abortSignal,
  });

  // Add summary to timeline
  timelineEvents.push({
    type: "moderator",
    content: summary,
  });

  // Save final timeline with summary and minutes to database
  await saveTimelineEvent({
    timelineToken,
    timelineEvents,
    summary,
    minutes,
    logger,
  });

  return { timelineEvents, summary };
}
