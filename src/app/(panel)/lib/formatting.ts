import "server-only";

import { DiscussionTimelineEvent } from "@/app/(panel)/types";
import { Locale } from "next-intl";

/**
 * Format timeline events as drama script for a specific persona
 * Each persona sees: moderator questions only (not initial user question) + other personas' messages + own messages (marked as "Me")
 */
export function formatTimelineForPersona(
  timelineEvents: DiscussionTimelineEvent[],
  personaId: number,
  locale: Locale,
): string {
  const lines: string[] = [];

  for (const event of timelineEvents) {
    if (event.type === "question") {
      // Personas only see moderator questions, not the initial user question
      if (event.author === "moderator") {
        lines.push(locale === "zh-CN" ? `主持人: ${event.content}` : `Moderator: ${event.content}`);
      }
      // Skip questions with author: "user" - these are only for the moderator
    } else if (event.type === "persona-reply") {
      if (event.personaId === personaId) {
        lines.push(locale === "zh-CN" ? `Me: ${event.content}` : `Me: ${event.content}`);
      } else {
        lines.push(`${event.personaName}: ${event.content}`);
      }
    } else if (event.type === "moderator") {
      lines.push(locale === "zh-CN" ? `主持人: ${event.content}` : `Moderator: ${event.content}`);
    }
    // Skip moderator-selection events for persona view
  }

  return lines.join("\n");
}

/**
 * Format complete timeline as drama script for moderator
 * Moderator sees all events including initial user question and all moderator questions
 */
export function formatTimelineForModerator(
  timelineEvents: DiscussionTimelineEvent[],
  locale: Locale,
): string {
  const lines: string[] = [];

  for (const event of timelineEvents) {
    if (event.type === "question") {
      // Moderator sees both user questions (initial core questions) and moderator questions
      const prefix =
        event.author === "user"
          ? locale === "zh-CN"
            ? "用户核心问题: "
            : "User Core Question: "
          : locale === "zh-CN"
            ? "主持人: "
            : "Moderator: ";
      lines.push(`${prefix}${event.content}`);
    } else if (event.type === "persona-reply") {
      lines.push(`${event.personaName}: ${event.content}`);
    } else if (event.type === "moderator") {
      lines.push(locale === "zh-CN" ? `主持人: ${event.content}` : `Moderator: ${event.content}`);
    }
  }

  return lines.join("\n");
}
