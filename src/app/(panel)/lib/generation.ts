import "server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import { calculateStepTokensUsage, TReduceTokens } from "@/ai/usage";
import { VALID_LOCALES } from "@/i18n/routing";
import { google } from "@ai-sdk/google";
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { generateText, stepCountIs, UserModelMessage } from "ai";
import { Logger } from "pino";
import { DiscussionTypeConfig } from "../discussionTypes";
import { minutesSystem } from "../prompt/minutes";
import { DiscussionTimelineEvent, PersonaSession } from "../types";
import { formatTimelineForModerator, formatTimelineForPersona } from "./formatting";

type Locale = (typeof VALID_LOCALES)[number];

/**
 * Generate persona reply
 */
export async function generatePersonaReply({
  personaSession,
  timelineEvents: timeline,
  nextQuestion,
  discussionTypeConfig,
  locale,
  abortSignal,
  statReport,
  logger,
  round,
}: {
  personaSession: PersonaSession;
  timelineEvents: DiscussionTimelineEvent[];
  nextQuestion: string;
  discussionTypeConfig: DiscussionTypeConfig;
  locale: Locale;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  logger: Logger;
  round: number;
}): Promise<string> {
  const reduceTokens: TReduceTokens = { model: "gemini-2.5-flash", ratio: 10 };
  const tools = {
    ...(reduceTokens && reduceTokens.model.startsWith("gemini")
      ? {
          google_search: google.tools.googleSearch({ mode: "MODE_DYNAMIC" }),
          url_context: google.tools.urlContext({}),
        }
      : {}),
  };

  const task =
    locale === "zh-CN"
      ? `请回答主持人的问题：${nextQuestion}\n\n同时，你也可以积极地回应他人的观点，给出你的观点。`
      : `Please answer the moderator's question: ${nextQuestion}\n\nYou can also actively respond to others' viewpoints and share your own.`;

  const formattedTimeline = formatTimelineForPersona(timeline, personaSession.personaId, locale);
  const modelMessages: UserModelMessage[] = [
    { role: "user", content: discussionTypeConfig.panelRules({ locale }) },
    {
      role: "user",
      content: `${formattedTimeline}\n\n${task}`,
      providerOptions:
        // 每 4 轮设置一个 cache checkpoint
        round % 4 === 1 && !reduceTokens
          ? { bedrock: { cachePoint: { type: "default" } } }
          : undefined,
    },
  ];

  const { usage, providerMetadata, text } = await generateText({
    model: reduceTokens ? llm(reduceTokens.model) : llm("claude-sonnet-4"),
    providerOptions: defaultProviderOptions,
    system: personaSession.systemPrompt,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(2),
    maxOutputTokens: 500,
    temperature: 0.7,
    abortSignal,
  });

  // Report token usage
  const { tokens, extra } = calculateStepTokensUsage({ usage, providerMetadata }, { reduceTokens });
  logger.info({
    msg: "Persona reply generated",
    personaId: personaSession.personaId,
    usage: extra.usage,
    cache: extra.cache,
  });
  await statReport("tokens", tokens, {
    reportedBy: "discussionChat",
    step: "persona-reply",
    personaId: personaSession.personaId,
    ...extra,
  });

  return text.trim();
}

/**
 * Generate summary and minutes in parallel
 */
export async function generateSummaryAndMinutes({
  timelineEvents: timeline,
  discussionTypeConfig,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  timelineEvents: DiscussionTimelineEvent[];
  discussionTypeConfig: DiscussionTypeConfig;
  locale: Locale;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  logger: Logger;
}): Promise<{ summary: string; minutes: string }> {
  const completeScript = formatTimelineForModerator(timeline, locale);
  const summaryTask =
    locale === "zh-CN"
      ? "请生成一份详细的讨论总结，涵盖所有参与者的主要观点和共识。"
      : "Please generate a detailed discussion summary covering all participants' main viewpoints and consensus.";

  // Filter timeline events for minutes: only "question" and "persona-reply" types
  const minutesEvents = timeline.filter(
    (e): e is Extract<DiscussionTimelineEvent, { type: "question" | "persona-reply" }> =>
      e.type === "question" || e.type === "persona-reply",
  );
  const minutesInput = JSON.stringify(minutesEvents, null, 2);
  const minutesTask =
    locale === "zh-CN"
      ? "请将以下对话转化为结构化讨论纪要。"
      : "Please process the following conversation transcript into Structured Discussion Minutes.";

  // Generate summary and minutes in parallel
  const [summaryResponse, minutesResponse] = await Promise.all([
    generateText({
      model: llm("gpt-5-mini"),
      providerOptions: {
        openai: {
          reasoningSummary: "auto",
          reasoningEffort: "minimal",
        } satisfies OpenAIResponsesProviderOptions,
      },
      system: discussionTypeConfig.panelSummarySystem({ locale }),
      messages: [{ role: "user", content: `${completeScript}\n\n${summaryTask}` }],
      // maxOutputTokens: 2000, // 设置 maxOutputTokens 给 gpt-5-mini，在上限达到的时候 text 是空的，可能是个 generateText 的 bug
      abortSignal,
    }).then(async (response) => {
      const tokens = calculateStepTokensUsage(response);
      logger.info({ msg: "Summary generated", ...tokens.extra });
      await statReport("tokens", tokens.tokens, {
        reportedBy: "discussionChat",
        step: "summary",
        ...tokens.extra,
      });
      return response;
    }),
    generateText({
      model: llm("gpt-5-mini"),
      providerOptions: {
        openai: {
          reasoningSummary: "auto",
          reasoningEffort: "minimal",
        } satisfies OpenAIResponsesProviderOptions,
      },
      system: minutesSystem({ locale }),
      messages: [{ role: "user" as const, content: `${minutesInput}\n\n${minutesTask}` }],
      // maxOutputTokens: 3000,
      abortSignal,
    }).then(async (response) => {
      // Report token usage for minutes
      const tokens = calculateStepTokensUsage(response);
      logger.info({ msg: "Minutes generated", ...tokens.extra });
      await statReport("tokens", tokens.tokens, {
        reportedBy: "discussionChat",
        step: "minutes",
        ...tokens.extra,
      });
      return response;
    }),
  ]);

  return {
    summary: summaryResponse.text.trim(),
    minutes: minutesResponse.text.trim(),
  };
}
