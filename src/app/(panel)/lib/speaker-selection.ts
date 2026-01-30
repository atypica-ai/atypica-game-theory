import "server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import { VALID_LOCALES } from "@/i18n/routing";
import { generateObject, UserModelMessage } from "ai";
import { Logger } from "pino";
import { z } from "zod";
import { DiscussionTimelineEvent, PersonaSession } from "../types";
import { formatTimelineForModerator } from "./formatting";

type Locale = (typeof VALID_LOCALES)[number];

/**
 * Schema for moderator speaker selection output
 */
const selectNextSpeakerSchema = z.object({
  thinking: z
    .string()
    .describe("The assessment of the situation and the logic that yields the next move"),
  personaId: z.number().describe("The ID of the selected persona"),
  followUpQuestion: z.string().describe("The follow-up question to ask the selected persona"),
});

/**
 * @deprecated Legacy random next speaker selection.
 * Use with caution: prefer newer strategies if available.
 *
 * Select next speaker using random strategy.
 * Prefers unspoken personas, then random selection.
 */
export function selectNextSpeakerRandom({
  personaSessions,
  timelineEvents,
}: {
  personaSessions: PersonaSession[];
  timelineEvents: DiscussionTimelineEvent[];
}): PersonaSession {
  const spokenPersonaIds = new Set(
    timelineEvents
      .filter(
        (e): e is Extract<DiscussionTimelineEvent, { type: "persona-reply" }> =>
          e.type === "persona-reply",
      )
      .map((e) => e.personaId),
  );

  // Find the last speaker (most recent persona-reply)
  const lastSpeakerId = timelineEvents
    .filter(
      (e): e is Extract<DiscussionTimelineEvent, { type: "persona-reply" }> =>
        e.type === "persona-reply",
    )
    .slice(-1)[0]?.personaId;

  // Filter out unspoken personas, excluding the last speaker
  const unspoken = personaSessions.filter(
    (s) => !spokenPersonaIds.has(s.personaId) && s.personaId !== lastSpeakerId,
  );

  if (unspoken.length > 0) {
    return unspoken[Math.floor(Math.random() * unspoken.length)]!;
  }

  // All have spoken (or only last speaker hasn't), random selection excluding last speaker
  const available = personaSessions.filter((s) => s.personaId !== lastSpeakerId);
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)]!;
  }

  // Fallback: if somehow only one persona exists, return it (shouldn't happen in practice)
  return personaSessions[0]!;
}

/**
 * Select next speaker using moderator strategy
 * Moderator (LLM) selects based on discussion content
 * Returns the selected persona session and reason
 */
export async function selectNextSpeakerModerator({
  personaSessions,
  timelineEvents,
  moderatorSystem,
  locale,
  abortSignal,
  statReport,
  logger,
  round,
}: {
  personaSessions: PersonaSession[];
  timelineEvents: DiscussionTimelineEvent[];
  moderatorSystem: (params: { locale: Locale }) => string;
  locale: Locale;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  logger: Logger;
  round: number;
}): Promise<{ nextQuestion: string; session: PersonaSession; reason: string }> {
  // Find the last speaker to exclude from selection
  const lastSpeakerId = timelineEvents
    .filter(
      (e): e is Extract<DiscussionTimelineEvent, { type: "persona-reply" }> =>
        e.type === "persona-reply",
    )
    .slice(-1)[0]?.personaId;

  // Filter out the last speaker from available personas
  const availablePersonas = personaSessions.filter((s) => s.personaId !== lastSpeakerId);

  const script = formatTimelineForModerator(timelineEvents, locale);
  const task =
    locale === "zh-CN"
      ? `请输出思维过程，然后从以下参与者中选择下一个发言者，最后输出接下来的问题。参与者列表：${availablePersonas.map((s) => `${s.personaName} (ID: ${s.personaId})`).join(", ")}`
      : `Please select the next speaker from the following participants and explain your reasoning. Participants: ${availablePersonas.map((s) => `${s.personaName} (ID: ${s.personaId})`).join(", ")}`;

  const modelMessages: UserModelMessage[] = [
    {
      role: "user",
      content: `${script}\n\n${task}`,
      providerOptions:
        // 每 4 轮设置一个 cache checkpoint
        round % 4 === 1 ? { bedrock: { cachePoint: { type: "default" } } } : undefined,
    },
  ];

  try {
    const result = await generateObject({
      model: llm("claude-sonnet-4"),
      providerOptions: defaultProviderOptions(),
      system: moderatorSystem({ locale }),
      schema: selectNextSpeakerSchema,
      messages: modelMessages,
      maxRetries: 2,
      abortSignal,
    });

    // Report token usage
    const { tokens, extra } = calculateStepTokensUsage(result);
    logger.info({
      msg: "Moderator speaker selection completed",
      usage: extra.usage,
      cache: extra.cache,
    });
    await statReport("tokens", tokens, {
      reportedBy: "discussionChat",
      step: "moderator-selection",
      ...extra,
    });

    const { thinking, personaId, followUpQuestion } = result.object;

    // Find the selected persona session
    const selectedSession = availablePersonas.find((s) => s.personaId === personaId);

    if (selectedSession) {
      logger.info(`Selected persona: ${selectedSession.personaId}`);
      return {
        nextQuestion: followUpQuestion,
        session: selectedSession,
        reason: thinking,
      };
    } else {
      logger.warn(`Invalid personaId ${personaId} returned, using random selection. ${thinking}`);
      // Fallback to random if personaId doesn't match any available persona
      const fallbackSession = selectNextSpeakerRandom({ personaSessions, timelineEvents });
      return {
        nextQuestion:
          followUpQuestion ||
          (locale === "zh-CN" ? "请继续参与讨论。" : "Please continue the discussion."),
        session: fallbackSession,
        reason: `Invalid personaId ${personaId} returned, using random selection. ${thinking}`,
      };
    }
  } catch (error) {
    logger.warn(
      `Error in moderator selection: ${(error as Error).message}, using random selection`,
    );
    // Fallback to random if generateObject fails
    const fallbackSession = selectNextSpeakerRandom({ personaSessions, timelineEvents });
    return {
      nextQuestion: locale === "zh-CN" ? "请继续参与讨论。" : "Please continue the discussion.",
      session: fallbackSession,
      reason: `Error in moderator selection: ${(error as Error).message}`,
    };
  }
}
