import "server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { createStructuredExtractor } from "@/ai/structuredExtract";
import type { PulseExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { xai } from "@ai-sdk/xai";
import { stepCountIs, streamText, ToolSet, TypeValidationError } from "ai";
import type { Locale } from "next-intl";
import { Logger } from "pino";
import { z } from "zod";
import { HEAT_CONFIG } from "./config";
import { gatherPostsLastStep, gatherPostsSystem } from "./prompt";
import type { PulsePostData } from "./types";

const MAX_STEPS = 2;

const postsSchema = z.object({
  posts: z.array(
    z.object({
      postId: z.string().describe("X/Twitter post ID"),
      content: z.string().describe("Summarization of post content/text (main text of the post)"),
      views: z.number().describe("Number of views"),
      likes: z.number().describe("Number of likes"),
      retweets: z.number().describe("Number of retweets"),
      replies: z.number().describe("Number of replies"),
      url: z.string().optional().describe("Post URL"),
      author: z.string().optional().describe("Post author username"),
    }),
  ),
});

type ParsedPost = z.infer<typeof postsSchema>["posts"][number];

interface PostData {
  postId: string;
  content: string;
  views: number;
  likes: number;
  retweets: number;
  replies: number;
  url?: string;
  author?: string;
}

function shouldFilterPost(post: PostData): boolean {
  const views = post.views || 0;
  if (views === 0) return true;

  const likes = post.likes || 0;
  const retweets = post.retweets || 0;
  const replies = post.replies || 0;
  const totalEngagement = likes + retweets + replies;

  const engagementRate = totalEngagement / views;
  const retweetRate = retweets / views;
  const replyRate = replies / views;

  if (engagementRate > HEAT_CONFIG.MAX_ENGAGEMENT_RATE) return true;
  if (views < HEAT_CONFIG.MIN_VIEWS_FOR_HIGH_ENGAGEMENT && engagementRate > 0.2) return true;
  if (retweetRate > HEAT_CONFIG.MAX_RETWEET_RATE || replyRate > HEAT_CONFIG.MAX_REPLY_RATE) return true;

  return false;
}

async function recordPulseError(
  pulseId: number,
  reason: string,
  details: string,
  logger: Logger,
): Promise<void> {
  try {
    const pulse = await prisma.pulse.findUnique({
      where: { id: pulseId },
      select: { extra: true },
    });

    const currentExtra = pulse?.extra ?? {};
    await prisma.pulse.update({
      where: { id: pulseId },
      data: {
        extra: {
          ...currentExtra,
          error: { reason, details, timestamp: new Date().toISOString() },
        } as PulseExtra,
      },
    });
  } catch (updateError) {
    logger.error({
      msg: "Failed to record error in pulse extra field",
      error: (updateError as Error).message,
    });
  }
}

/**
 * Gather top posts for a pulse using Grok with x-search
 */
export async function gatherPostsForPulse({
  pulseId,
  title,
  locale,
  abortSignal,
  logger,
}: {
  pulseId: number;
  title: string;
  locale: Locale;
  abortSignal: AbortSignal;
  logger: Logger;
}): Promise<PulsePostData[]> {
  const pulseLogger = logger.child({ pulseId, pulseTitle: title });

  const allTools: ToolSet = {
    x_search: xai.tools.xSearch({
      enableImageUnderstanding: true,
      enableVideoUnderstanding: true,
    }),
  } as ToolSet;

  const systemPrompt = gatherPostsSystem({ locale });
  const userMessage =
    locale === "zh-CN"
      ? `找到关于「${title}」的 ${HEAT_CONFIG.POSTS_PER_PULSE} 条浏览量最高的帖子。提取帖子内容/正文和互动数据（浏览量、点赞、转发、回复）。`
      : `Find the ${HEAT_CONFIG.POSTS_PER_PULSE} most viewed posts about: "${title}". Extract the post content/text and engagement metrics (views, likes, retweets, replies) for each post.`;

  return new Promise<PulsePostData[]>((resolve, reject) => {
    const posts: PostData[] = [];

    const response = streamText({
      model: llm("grok-4-1-fast-non-reasoning"),
      system: systemPrompt,
      providerOptions: defaultProviderOptions(),
      tools: allTools,
      toolChoice: "auto",
      messages: [{ role: "user", content: userMessage }],
      abortSignal,
      stopWhen: stepCountIs(MAX_STEPS),
      prepareStep: async ({ stepNumber, messages }) => {
        if (stepNumber === MAX_STEPS - 1) {
          return {
            messages: [
              ...messages,
              { role: "user" as const, content: gatherPostsLastStep({ locale }) },
            ],
          };
        }
        return {};
      },
      onError: async ({ error }: { error: unknown }) => {
        const isTypeValidation =
          error instanceof TypeValidationError ||
          (error as Error).name === "TypeValidationError" ||
          (error as Error).message?.includes("Type validation failed");

        if (isTypeValidation) {
          pulseLogger.debug({
            msg: "xAI TypeValidationError ignored",
            error: (error as Error).message,
          });
          return;
        }
        const errorMessage = (error as Error).message || String(error);
        pulseLogger.error({
          msg: "gatherPosts streamText onError",
          error: errorMessage,
          stack: (error as Error).stack,
        });
        await recordPulseError(pulseId, "stream_error", errorMessage, pulseLogger);
        reject(error);
      },
      onFinish: async ({ text }: { steps: unknown[]; text: string }) => {
        if (!text || text.trim().length === 0) {
          pulseLogger.warn("No text output from Grok response");
          await recordPulseError(pulseId, "no_text_output", "Grok returned empty text response", pulseLogger);
          resolve([]);
          return;
        }

        try {
          const parsePosts = createStructuredExtractor(postsSchema);
          const parsed = await parsePosts(text, {
            abortSignal,
            logger: pulseLogger,
          });

          const parsedPosts: PostData[] = parsed.posts || [];

          if (parsedPosts.length === 0) {
            pulseLogger.warn("No posts found in parsed response");
            await recordPulseError(pulseId, "no_posts_found", "Parser found no posts in Grok response", pulseLogger);
            resolve([]);
            return;
          }

          const mappedPosts = parsedPosts.map(
            (p: ParsedPost): PostData => ({
              postId: p.postId,
              content: p.content || "",
              views: p.views || 0,
              likes: p.likes || 0,
              retweets: p.retweets || 0,
              replies: p.replies || 0,
              url: p.url,
              author: p.author,
            }),
          );

          const filteredPosts = mappedPosts.filter((post) => {
            const shouldFilter = shouldFilterPost(post);
            if (shouldFilter) {
              pulseLogger.debug({
                msg: "Filtered post with suspicious engagement",
                postId: post.postId,
                views: post.views,
                engagementRate: (post.likes + post.retweets + post.replies) / (post.views || 1),
              });
            }
            return !shouldFilter;
          });

          if (filteredPosts.length === 0) {
            pulseLogger.warn("All posts filtered out due to suspicious engagement patterns");
            await recordPulseError(
              pulseId,
              "all_posts_filtered",
              `All ${parsedPosts.length} posts were filtered out due to suspicious engagement patterns`,
              pulseLogger,
            );
            resolve([]);
            return;
          }

          posts.push(...filteredPosts);
        } catch (error) {
          const errorMessage = (error as Error).message || String(error);
          pulseLogger.error({
            msg: "Failed to parse posts from text",
            error: errorMessage,
            stack: (error as Error).stack,
          });
          await recordPulseError(pulseId, "parsing_failed", errorMessage, pulseLogger);
          reject(error);
          return;
        }

        // Save posts to pulse.extra.posts
        try {
          const postsData: PulsePostData[] = posts.map((post) => ({
            postId: post.postId,
            content: post.content,
            views: post.views,
            likes: post.likes,
            retweets: post.retweets,
            replies: post.replies,
            url: post.url,
            author: post.author,
          }));

          const pulse = await prisma.pulse.findUnique({
            where: { id: pulseId },
            select: { extra: true },
          });
          const currentExtra = pulse?.extra ?? {};

          await prisma.pulse.update({
            where: { id: pulseId },
            data: { extra: { ...currentExtra, posts: postsData } },
          });

          pulseLogger.info({
            msg: "Posts gathered and saved to pulse.extra",
            postCount: postsData.length,
          });

          resolve(postsData);
        } catch (error) {
          const errorMessage = (error as Error).message || String(error);
          pulseLogger.error({ msg: "Failed to save posts to database", error: errorMessage });
          await recordPulseError(pulseId, "database_save_failed", errorMessage, pulseLogger);
          reject(error);
        }
      },
    });

    response.consumeStream().catch(async (error: unknown) => {
      const isTypeValidation =
        error instanceof TypeValidationError ||
        (error as Error).name === "TypeValidationError" ||
        (error as Error).message?.includes("Type validation failed");

      if (isTypeValidation) {
        pulseLogger.debug({
          msg: "xAI TypeValidationError ignored in consumeStream",
          error: (error as Error).message,
        });
        return;
      }
      const errorMessage = (error as Error).message || String(error);
      await recordPulseError(pulseId, "stream_consume_error", errorMessage, pulseLogger);
      reject(error);
    });
  });
}
