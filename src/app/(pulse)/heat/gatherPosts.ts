"server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { xai } from "@ai-sdk/xai";
import { stepCountIs, streamText, ToolSet, TypeValidationError } from "ai";
import { Logger } from "pino";
import { promptSystemConfig } from "@/ai/prompt/systemConfig";
import { z } from "zod";
import { prisma } from "@/prisma/prisma";
import { HEAT_CONFIG } from "./config";
import type { PulsePostData, PulseExtra } from "@/prisma/client";
import { createParser } from "@/ai/parser";

const MAX_STEPS = 2;

/**
 * Schema for parsing posts from text output
 */
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

/**
 * Post data structure returned by parser
 */
type ParsedPost = z.infer<typeof postsSchema>["posts"][number];

/**
 * Post data structure with extra field for database
 */
interface PostData {
  postId: string;
  content: string;
  views: number;
  likes: number;
  retweets: number;
  replies: number;
  extra?: Record<string, unknown>;
}

/**
 * Check if a post should be filtered due to suspicious engagement patterns
 * Filters out posts with fake/bought engagement (extremely high engagement rates)
 * 
 * @param post - Post data to check
 * @returns true if post should be filtered (suspicious), false otherwise
 */
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

  // Red flag 1: Overall engagement too high
  if (engagementRate > HEAT_CONFIG.MAX_ENGAGEMENT_RATE) {
    return true;
  }

  // Red flag 2: Small post with extreme engagement (likely bought)
  if (
    views < HEAT_CONFIG.MIN_VIEWS_FOR_HIGH_ENGAGEMENT &&
    engagementRate > 0.2
  ) {
    return true;
  }

  // Red flag 3: Unnatural retweet/reply patterns
  if (
    retweetRate > HEAT_CONFIG.MAX_RETWEET_RATE ||
    replyRate > HEAT_CONFIG.MAX_REPLY_RATE
  ) {
    return true;
  }

  return false;
}

/**
 * Record error in pulse's extra field
 */
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

    const currentExtra = (pulse?.extra as Record<string, unknown>) || {};
    await prisma.pulse.update({
      where: { id: pulseId },
      data: {
        extra: {
          ...currentExtra,
          error: {
            reason,
            details,
            timestamp: new Date().toISOString(),
          },
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
 * Finds the 10 most viewed posts about the pulse topic and extracts engagement metrics
 *
 * @param pulseId - Pulse ID to gather posts for
 * @param title - Pulse title to search for
 * @param logger - Logger instance
 * @returns Array of PulsePost records (already saved to database)
 */
export async function gatherPostsForPulse(
  pulseId: number,
  title: string,
  logger: Logger,
): Promise<PulsePostData[]> {
  const pulseLogger = logger.child({ pulseId, pulseTitle: title });

  const allTools: ToolSet = {
    x_search: xai.tools.xSearch({
      enableImageUnderstanding: true,
      enableVideoUnderstanding: true,
    }),
  } as ToolSet;

  const systemPrompt = `
# Role
You are a social media analytics expert specializing in finding high-engagement posts on X (Twitter).

# Task
Find the ${HEAT_CONFIG.POSTS_PER_PULSE} MOST viewed posts about a given topic.
Use x_search to find posts and extract accurate engagement metrics (views, likes, retweets, replies) for each post.

# Requirements
- Find posts with the highest views only
- Summarize the post content/text (main text of the post) and Extract accurate engagement metrics, Id, url, and author as schema requires.
- Continue your search until you have ${HEAT_CONFIG.POSTS_PER_PULSE}, or until I tell you to output.

# Output Format
Output your findings directly in your message. FORBID usage of markdown format (**, #, etc.), it breaks parsing. Format each post as:
"""
Post ID: [post id]
Content: [post content/text summary in 1 sentence LESS THAN 100 characters]
Views: [number]
Likes: [number]
Retweets: [number]
Replies: [number]
URL: [post url]
Author: [author username]
"""
List all posts, one per post in the format above.

# Honesty
Return empty list if no posts found. Do not make up any posts. Record honestly.
${promptSystemConfig({ locale: "en-US" })}
`;

  return new Promise<PulsePostData[]>((resolve, reject) => {
    const posts: PostData[] = [];

    const abortController = new AbortController();
    const response = streamText({
      model: llm("grok-4-1-fast-non-reasoning"),
      system: systemPrompt,
      providerOptions: defaultProviderOptions(),
      tools: allTools,
      toolChoice: "auto",
      messages: [
        {
          role: "user",
          content: `Find the ${HEAT_CONFIG.POSTS_PER_PULSE} most viewed posts about: "${title}". Extract the post content/text and engagement metrics (views, likes, retweets, replies) for each post.`,
        },
      ],
      abortSignal: abortController.signal,
      stopWhen: stepCountIs(MAX_STEPS),
      prepareStep: async ({ stepNumber, messages }) => {
        if (stepNumber === MAX_STEPS - 1) {
          return {
            messages: [
              ...messages,
              {
                role: "user" as const,
                content:
                  "You have reached the last step. Please output your findings in the specified format. If no posts found, state that clearly.",
              },
            ],
          };
        }
        return {};
      },
      onError: async ({ error }: { error: unknown }) => {
        const isTypeValidationError =
          error instanceof TypeValidationError ||
          (error as Error).name === "TypeValidationError" ||
          (error as Error).message?.includes("Type validation failed");

        if (isTypeValidationError) {
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
        // Parse text output using parser module
        if (!text || text.trim().length === 0) {
          pulseLogger.warn("No text output from Grok response");
          await recordPulseError(
            pulseId,
            "no_text_output",
            "Grok returned empty text response",
            pulseLogger,
          );
          resolve([]);
          return;
        }

        try {
          const parsePosts = createParser(postsSchema);
          const parsed = await parsePosts(text, {
            abortSignal: abortController.signal,
            logger: pulseLogger,
          });

          const parsedPosts: PostData[] = parsed.posts || [];

          if (parsedPosts.length === 0) {
            pulseLogger.warn("No posts found in parsed response");
            await recordPulseError(
              pulseId,
              "no_posts_found",
              "Parser found no posts in Grok response",
              pulseLogger,
            );
            resolve([]);
            return;
          }

          // Map parsed posts to PostData format and filter suspicious posts
          const mappedPosts = parsedPosts.map((p: ParsedPost): PostData => ({
            postId: p.postId,
            content: p.content || "",
            views: p.views || 0,
            likes: p.likes || 0,
            retweets: p.retweets || 0,
            replies: p.replies || 0,
            extra: {
              url: p.url,
              author: p.author,
            } as Record<string, unknown>,
          }));

          // Filter out posts with suspicious engagement patterns
          const filteredPosts = mappedPosts.filter((post) => {
            const shouldFilter = shouldFilterPost(post);
            if (shouldFilter) {
              pulseLogger.debug({
                msg: "Filtered post with suspicious engagement",
                postId: post.postId,
                views: post.views,
                likes: post.likes,
                retweets: post.retweets,
                replies: post.replies,
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
            url: (post.extra as Record<string, string> | undefined)?.url,
            author: (post.extra as Record<string, string> | undefined)?.author,
          }));

          const pulse = await prisma.pulse.findUnique({
            where: { id: pulseId },
            select: { extra: true },
          });
          const currentExtra = (pulse?.extra as PulseExtra) || {};

          await prisma.pulse.update({
            where: { id: pulseId },
            data: {
              extra: { ...currentExtra, posts: postsData } as PulseExtra,
            },
          });

          pulseLogger.info({
            msg: "Posts gathered and saved to pulse.extra",
            postCount: postsData.length,
          });

          resolve(postsData);
        } catch (error) {
          const errorMessage = (error as Error).message || String(error);
          pulseLogger.error({
            msg: "Failed to save posts to database",
            error: errorMessage,
          });
          await recordPulseError(pulseId, "database_save_failed", errorMessage, pulseLogger);
          reject(error);
        }
      },
    });

    response.consumeStream().catch(async (error: unknown) => {
      const isTypeValidationError =
        error instanceof TypeValidationError ||
        (error as Error).name === "TypeValidationError" ||
        (error as Error).message?.includes("Type validation failed");

      if (isTypeValidationError) {
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

