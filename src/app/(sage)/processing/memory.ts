import "server-only";

import { llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import { createOrUpdateMemoryDocument } from "@/app/(sage)/lib";
import {
  buildSageCoreMemorySystemPrompt,
  buildSageProfileSystemPrompt,
} from "@/app/(sage)/prompt/memory";
import type { SageSourceContent } from "@/app/(sage)/types";
import { SageExtra } from "@/app/(sage)/types";
import { Sage, SageSource } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { generateObject, streamText, UserModelMessage } from "ai";
import type { Locale } from "next-intl";
import { Logger } from "pino";
import z from "zod";

/**
 * Extract knowledge and build memory document from completed sources
 * Step 1: buildSageProfile
 * Step 2: buildSageCoreMemory
 * Will create a new version of the memory document
 */
export async function extractKnowledgeFromSources({
  sageId,
  locale,
  logger,
  statReport,
  abortSignal,
}: {
  sageId: number;
  locale: Locale;
  logger: Logger;
  statReport: StatReporter;
  abortSignal: AbortSignal;
}): Promise<void> {
  const [sage, completedSources] = await Promise.all([
    prisma.sage.findUniqueOrThrow({
      where: { id: sageId },
      select: { id: true, name: true, domain: true },
    }),
    prisma.sageSource
      .findMany({
        where: { sageId, extractedText: { not: "" } },
        orderBy: { id: "asc" },
      })
      .then((sources) =>
        sources.map(({ content, ...source }) => ({
          ...source,
          content: content as SageSourceContent,
        })),
      ),
  ]);

  if (completedSources.length === 0) {
    throw new Error("No sources were successfully processed");
  }
  logger.info({
    msg: "Extracting knowledge from sage sources",
    sourcesCount: completedSources.length,
  });
  const sageSources = completedSources;

  // Step 1 & 2: Generate profile and build memory document in parallel
  const [, coreMemory] = await Promise.all([
    extractKnowledge_1_buildSageProfile({
      sage,
      sageSources,
      locale,
      statReport,
      logger,
      abortSignal,
    }).then(async ({ categories: expertise, bio, recommendedQuestions }) => {
      // Update sage immediately after profile generation
      await prisma.sage.update({
        where: { id: sageId },
        data: { expertise, bio },
      });
      // Update SageExtra with recommended questions
      await mergeExtra({
        tableName: "Sage",
        id: sageId,
        extra: { recommendedQuestions } satisfies SageExtra,
      });
    }),
    extractKnowledge_2_buildSageCoreMemory({
      sage,
      sageSources,
      locale,
      statReport,
      logger,
      abortSignal,
    }),
  ]);

  // Save Memory Document as first version
  await createOrUpdateMemoryDocument({
    sageId,
    operation: "extract_from_sources",
    coreMemory: coreMemory,
    changeNotes: "Extract knowledge from sources",
  });

  logger.info({ msg: "Knowledge extraction completed successfully" });
}

/**
 * Generate sage profile including categories, bio, and recommended questions
 */
async function extractKnowledge_1_buildSageProfile({
  sage,
  sageSources,
  locale,
  statReport,
  logger,
  abortSignal,
}: {
  sage: Pick<Sage, "id" | "name" | "domain">;
  sageSources: (Pick<SageSource, "id" | "extractedText"> & { content: SageSourceContent })[];
  locale: Locale;
  statReport: StatReporter;
  logger: Logger;
  abortSignal: AbortSignal;
}): Promise<{
  categories: string[];
  bio: string;
  recommendedQuestions: string[];
}> {
  const allExtractedTexts = sageSources
    .map((s) => s.extractedText)
    .filter((text): text is string => !!text);
  const rawContent = allExtractedTexts.join("\n\n---\n\n");

  const sageProfileSchema = z.object({
    categories: z
      .array(z.string())
      .describe("Suggested topic categories for organizing the knowledge (3-10 categories)"),
    bio: z.string().describe("2-3 sentence professional bio for the expert"),
    recommendedQuestions: z
      .array(z.string())
      .length(4)
      .describe("Exactly 4 recommended questions for users to ask the expert"),
  });

  const result = await generateObject({
    model: llm("gemini-3-flash"),
    schema: sageProfileSchema,
    system: buildSageProfileSystemPrompt({ sage, locale }),
    prompt: rawContent,
    maxRetries: 3,
    abortSignal,
  });

  if (result.usage.totalTokens) {
    const totalTokens = result.usage.totalTokens;
    await statReport("tokens", totalTokens, {
      reportedBy: "build sage profile",
    });
  }

  logger.info({
    msg: "buildSageProfile completed",
    categoriesCount: result.object.categories.length,
    recommendedQuestionsCount: result.object.recommendedQuestions.length,
  });

  return result.object;
}

/**
 * Build Sage CoreMemory from sources
 * Source text is already compressed, build with Claude
 */
export async function extractKnowledge_2_buildSageCoreMemory({
  sage,
  sageSources,
  locale,
  statReport,
  logger,
  abortSignal,
}: {
  sage: Pick<Sage, "id" | "name" | "domain">;
  sageSources: (Pick<SageSource, "id" | "extractedText"> & { content: SageSourceContent })[];
  locale: Locale;
  statReport: StatReporter;
  logger: Logger;
  abortSignal: AbortSignal;
}): Promise<string> {
  const allExtractedTexts = sageSources
    .map((s) => s.extractedText)
    .filter((text): text is string => !!text);
  const rawContent = allExtractedTexts.join("\n\n---\n\n");

  const messages: UserModelMessage[] = [
    {
      role: "user",
      content:
        locale === "zh-CN"
          ? "请根据以下内容，生成完整的、结构化的记忆文档。"
          : "Build a a complete, structured memory document based on the following content",
    },
    {
      role: "user",
      content: rawContent,
    },
  ];

  const promise = new Promise<string>(async (resolve, reject) => {
    let coreMemory = "";
    const buildingResponse = streamText({
      model: llm("claude-haiku-4-5"),
      system: buildSageCoreMemorySystemPrompt({ sage, locale }),
      messages,
      maxRetries: 3,
      onChunk: ({ chunk }) => {
        if (chunk.type === "text-delta") {
          coreMemory += chunk.text;
          logger.debug({
            msg: "buildSageCoreMemory",
            stage: "building",
            length: coreMemory.length,
          });
        }
      },
      onError: ({ error }) => {
        logger.error({
          msg: "buildSageCoreMemory onError",
          stage: "building",
          error: (error as Error).message,
        });
        reject(error);
      },
      onFinish: async ({ usage }) => {
        if (usage.totalTokens) {
          await statReport("tokens", usage.totalTokens, {
            reportedBy: "build core memory",
          });
        }
        logger.info({
          msg: "buildSageCoreMemory onFinish",
          stage: "building",
          length: coreMemory.length,
        });
        resolve(coreMemory);
      },
      abortSignal,
    });

    await buildingResponse
      .consumeStream()
      .then(() => {})
      .catch((error) => reject(error));
  });

  const coreMemory = await promise;
  return coreMemory;
}
