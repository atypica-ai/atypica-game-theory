import "server-only";

import { llm } from "@/ai/provider";
import { rootLogger } from "@/lib/logging";
import { detectInputLanguage } from "@/lib/textUtils";
import { PersonaPanel } from "@/prisma/client";
import { DiscussionTimelineUpdateInput } from "@/prisma/generated/internal/prismaNamespace";
import { prisma } from "@/prisma/prisma";
import { syncProject as syncProjectToMeili } from "@/search/lib/sync";
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { generateText } from "ai";
import { Locale } from "next-intl";
import { after } from "next/server";
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
    rootLogger.info(`Panel config saved with id: ${personaPanel.id}`);

    // Generate title asynchronously, then sync to Meilisearch
    after(
      generatePersonaPanelTitle(personaPanel.id)
        .then(() =>
          syncProjectToMeili({ type: "panel", id: personaPanel.id }).catch(() => {
            // 方法里已经 log 了，无需再次 log，这里跳过错误
          }),
        )
        .catch((error) => {
          rootLogger.error({
            msg: `Failed to generate title for panel ${personaPanel.id}`,
            error: error instanceof Error ? error.message : String(error),
          });
        }),
    );

    return personaPanel;
  } catch (error) {
    rootLogger.error(`Error saving panel config: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Generate a descriptive title for PersonaPanel based on personas
 */
export async function generatePersonaPanelTitle(personaPanelId: number): Promise<void> {
  const panel = await prisma.personaPanel.findUniqueOrThrow({
    where: { id: personaPanelId },
    select: {
      id: true,
      personaIds: true,
      instruction: true,
    },
  });

  if (!panel.personaIds || panel.personaIds.length === 0) {
    rootLogger.warn(`Panel ${personaPanelId} has no personas, skipping title generation`);
    return;
  }

  // Fetch personas data
  const personas = await prisma.persona.findMany({
    where: { id: { in: panel.personaIds as number[] } },
    select: {
      name: true,
      tags: true,
      source: true,
    },
  });

  if (personas.length === 0) {
    rootLogger.warn(`No personas found for panel ${personaPanelId}`);
    return;
  }

  // Build personas summary
  const personasSummary = personas.map((p) => `${p.name} (${p.tags.join(", ")})`).join("\n");

  // Detect locale from instruction or personas
  const textForDetection = [
    panel.instruction,
    ...personas.map((p) => p.name),
    ...personas.flatMap((p) => p.tags),
  ]
    .filter(Boolean)
    .join(" ");

  const locale: Locale = await detectInputLanguage({
    text: textForDetection,
  });

  const { text: title } = await generateText({
    model: llm("gpt-5-mini"),
    providerOptions: {
      openai: {
        reasoningSummary: "auto",
        reasoningEffort: "minimal",
      } satisfies OpenAIResponsesProviderOptions,
    },
    system:
      locale === "zh-CN"
        ? `你是一位专业的标题生成专家，需要为一组用户画像生成一个简洁准确的标题。

任务要求：
1. 分析这组用户画像的共同特征
2. 提炼出最能代表这些人的关键特点
3. 生成一个概括性标题，描述这些人是什么样的人

标题生成原则：
- 长度控制：不超过 20 个汉字
- 关注人群特征：年龄、职业、消费习惯、生活方式等
- 使用通俗易懂的语言
- 避免使用"用户画像"、"研究对象"等专业术语
- 直接描述人群，例如："年轻职场白领"、"中老年养生爱好者"

示例：
- "25-35岁都市白领"
- "科技数码爱好者"
- "高收入品质生活追求者"
- "90后新手妈妈"

请仅输出标题，不要输出任何其他内容。`
        : `You are a professional title generation expert. Generate a concise and accurate title for a group of user personas.

Task Requirements:
1. Analyze the common characteristics of these user personas
2. Extract the key traits that best represent these people
3. Generate a descriptive title that describes what kind of people they are

Title Generation Principles:
- Length limit: no more than 10 English words
- Focus on demographic traits: age, occupation, consumption habits, lifestyle, etc.
- Use clear and accessible language
- Avoid professional terms like "user personas" or "research subjects"
- Directly describe the group, e.g., "Young Urban Professionals", "Tech Enthusiasts"

Examples:
- "Young Urban Professionals"
- "Tech Gadget Enthusiasts"
- "High-Income Quality Seekers"
- "First-Time Millennial Parents"

Output only the title, nothing else.`,
    prompt: `Personas in this panel:\n\n${personasSummary}\n\nGenerate a title:`,
  });

  // Update panel title
  await prisma.personaPanel.update({
    where: { id: personaPanelId },
    data: { title: title.trim() },
  });

  rootLogger.info({
    msg: `Generated title for panel ${personaPanelId}`,
    title: title.trim(),
  });
}
