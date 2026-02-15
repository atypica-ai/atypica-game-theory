import "server-only";

import { llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import {
  PodcastKind,
  PodcastKindDetermination,
  podcastKindDeterminationSchema,
} from "@/app/(podcast)/types";
import { rootLogger } from "@/lib/logging";
import { generateToken } from "@/lib/utils";
import type { AnalystPodcast, AnalystPodcastExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { Locale } from "next-intl";
import { generatePodcast } from "./generation";

const PODCAST_KIND_DETERMINATION_SYSTEM = `
You are an expert podcast producer. Your task is to determine the best podcast format for a research topic based on its content and nature.

**Default preference**: Choose ${PodcastKind.opinionOriented} whenever the research has any actionable insights or practical implications. Only choose ${PodcastKind.deepDive} when the research is purely exploratory without clear recommendations.

## Available Podcast Formats

### 1. ${PodcastKind.opinionOriented} (观点导向) - PREFERRED FORMAT
**Format**: Solo host (the researcher) presenting with strong conviction
**Best for**: Most research with insights, findings, or implications
**Characteristics**:
- Research with conclusions and practical implications
- Topics where the researcher has findings that can guide decisions or actions
- Content that challenges common practices, misconceptions, or conventional wisdom
- Studies where findings have value for decision-making or behavior change
- Research that reveals what works, what doesn't, or what to consider
- The researcher acts as a guide sharing valuable insights
- **Default choice for most research with any actionable takeaways**

### 2. ${PodcastKind.deepDive} (深度探讨) - ONLY FOR PURELY EXPLORATORY CONTENT
**Format**: Two hosts (Guy & Ira) presenting from a third-party perspective
**Best for**: Purely exploratory research without clear conclusions
**Characteristics**:
- Research still in early stages with no definitive findings
- Purely theoretical or methodological discussions
- Content where the research process is the only story to tell
- Studies with no practical implications or recommendations yet
- **Only choose this when there are truly no actionable insights**

## Decision Guidelines

**Choose ${PodcastKind.opinionOriented} (PREFERRED) when**:
- The research has ANY findings, insights, or recommendations
- There are practical implications or learnings from the research
- The study reveals patterns, trends, or useful information
- The researcher has a perspective or interpretation of findings
- The content can help listeners understand or make decisions
- **When in doubt, choose opinionOriented as the default**

**Choose ${PodcastKind.deepDive} (ONLY WHEN NECESSARY) when**:
- The research is purely exploratory with no findings yet
- The content is entirely theoretical with no practical application
- There are literally no insights or recommendations to share
- The study is incomplete with no conclusions

## Output Requirement
You must choose either "${PodcastKind.deepDive}" or "${PodcastKind.opinionOriented}". Strongly prefer ${PodcastKind.opinionOriented} unless the research is purely exploratory. Provide clear, specific reasoning for your choice based on the research content, conclusions, and the value it provides to listeners.
`;

async function determinePodcastKind({
  studyLog,
}: {
  studyLog: string;
}): Promise<PodcastKindDetermination> {
  const determinationPrompt = `Please determine the best podcast format for this research:

**Study Log**: ${studyLog}

Based on the research content, conclusions, and the value it provides to listeners, determine whether this should be a "${PodcastKind.deepDive}" or "${PodcastKind.opinionOriented}" podcast. Provide clear, specific reasoning for your choice.`;

  const result = await generateObject({
    model: llm("gpt-5-mini"),
    providerOptions: {
      openai: {
        reasoningSummary: "auto",
        reasoningEffort: "minimal",
      } satisfies OpenAIResponsesProviderOptions,
    },
    system: PODCAST_KIND_DETERMINATION_SYSTEM,
    prompt: determinationPrompt,
    schema: podcastKindDeterminationSchema,
    schemaName: "PodcastKindDetermination",
    schemaDescription: "Determine the best podcast format for the research",
    maxRetries: 2,
  });

  rootLogger.info({
    msg: "determinePodcastKind completed",
    kind: result.object.kind,
    reason: result.object.reason,
  });

  return result.object;
}

/**
 * 这个方法现在没用到，但其实要用上更好
 */
export async function determineKindAndGeneratePodcast({
  userId,
  locale,
  studyLog,
  userChatToken,
  instruction,
  abortSignal,
  statReport,
}: {
  userId: number;
  locale: Locale;
  studyLog: string;
  userChatToken: string;
  instruction?: string;
  abortSignal: AbortSignal;
  statReport: StatReporter;
}): Promise<AnalystPodcast> {
  const logger = rootLogger.child({ method: "determineKindAndGeneratePodcast" });

  // Create podcast record
  let podcast = await prisma.analystPodcast.create({
    data: {
      userId,
      token: generateToken(),
      instruction: instruction || "",
      script: "",
      extra: { userChatToken } satisfies AnalystPodcastExtra,
    },
  });

  // Step 1: Determine podcast kind
  logger.info("Determining podcast kind");
  const kindDetermination = await determinePodcastKind({ studyLog });
  logger.info({
    msg: "Podcast kind determined",
    kind: kindDetermination.kind,
    reason: kindDetermination.reason,
  });

  await prisma.$executeRaw`
    UPDATE "AnalystPodcast"
    SET "extra" = COALESCE("extra", '{}') || ${JSON.stringify({ kindDetermination })}::jsonb,
        "updatedAt" = NOW()
    WHERE "id" = ${podcast.id}
  `;
  podcast = await prisma.analystPodcast.findUniqueOrThrow({ where: { id: podcast.id } });

  // Step 2: Generate podcast with the determined kind (no systemPrompt for auto-determined podcasts)
  await generatePodcast({
    locale,
    studyLog,
    podcast,
    abortSignal,
    statReport,
  });
  logger.info({ msg: "Podcast generated with kind determination", podcastId: podcast.id });

  podcast = await prisma.analystPodcast.findUniqueOrThrow({ where: { id: podcast.id } });

  // 目前通过 intercom 发送
  // await notifyPodcastReady({
  //   analystId: analyst.id,
  //   podcast: { token: podcast.token },
  //   logger,
  // });

  return podcast;
}
