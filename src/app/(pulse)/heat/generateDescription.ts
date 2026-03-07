"server-only";

import { llm } from "@/ai/provider";
import { generateText } from "ai";
import { Logger } from "pino";
import type { Pulse, PulsePost } from "@/prisma/client";

/**
 * Generate pulse description from posts using LLM
 * Summarizes the 10 posts to create an accurate pulse description based on actual trending content
 *
 * @param pulse - Pulse to generate description for
 * @param posts - Array of posts with engagement metrics
 * @param logger - Logger instance
 * @returns Generated description string
 */
export async function generateDescriptionFromPosts(
  pulse: Pulse,
  posts: PulsePost[],
  logger: Logger,
): Promise<string> {
  const pulseLogger = logger.child({ pulseId: pulse.id, postCount: posts.length });

  if (posts.length === 0) {
    pulseLogger.warn("No posts available for description generation, using original content");
    return pulse.content;
  }

  try {
    // Build context from posts (use post content for description generation)
    const postsContext = posts
      .map((post, index) => {
        const extra = (post.extra as Record<string, unknown>) || {};
        const postContent = (post as PulsePost & { content: string }).content || "";
        return `Post ${index + 1}:
- Content: ${postContent}
- Views: ${post.views}
- Likes: ${post.likes}
- Retweets: ${post.retweets}
- Replies: ${post.replies}
${extra.url ? `- URL: ${extra.url}` : ""}
${extra.author ? `- Author: ${extra.author}` : ""}`;
      })
      .join("\n\n");

    const systemPrompt = `You are a content summarization expert. Your task is to create a concise, accurate description of a trending topic based on TODAY's most engaging posts about it.

Generate a description that:
- Captures the CURRENT discussion direction and public opinion (how people are talking about this topic TODAY)
- Reflects the actual content and discussions from today's posts
- Highlights what's NEW or CHANGING in how this topic is being discussed (new angles, shifts in opinion, emerging perspectives)
- Is informative but concise (2-4 sentences)
- Focuses on why this topic is trending NOW and what makes today's discussion different or noteworthy

Important: The same topic can have different discussions on different days. Your description should capture TODAY's perspective, not a generic overview.`;

    const userPrompt = `Topic: ${pulse.title}

Here are the top ${posts.length} most viewed posts about this topic:

${postsContext}

Generate an accurate description of this trending topic based on these posts.`;

    const result = await generateText({
      model: llm("gpt-5-mini"), // Use cheaper model for description generation
      system: systemPrompt,
      prompt: userPrompt,
    });

    const description = result.text.trim();

    pulseLogger.info({
      msg: "Description generated successfully",
      descriptionLength: description.length,
    });

    return description;
  } catch (error) {
    pulseLogger.error({
      msg: "Failed to generate description",
      error: (error as Error).message,
    });
    // Fallback to original content if generation fails
    return pulse.content;
  }
}

