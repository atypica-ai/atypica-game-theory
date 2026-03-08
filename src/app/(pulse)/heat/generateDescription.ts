import "server-only";

import { llm } from "@/ai/provider";
import type { Pulse } from "@/prisma/client";
import { generateText } from "ai";
import type { Locale } from "next-intl";
import { Logger } from "pino";
import { generateDescriptionSystem } from "./prompt";
import type { PulsePostData } from "./types";

/**
 * Generate pulse description from posts using LLM
 */
export async function generateDescriptionFromPosts({
  pulse,
  posts,
  locale,
  logger,
}: {
  pulse: Pulse;
  posts: PulsePostData[];
  locale: Locale;
  logger: Logger;
}): Promise<string> {
  const pulseLogger = logger.child({ pulseId: pulse.id, postCount: posts.length });

  if (posts.length === 0) {
    pulseLogger.warn("No posts available for description generation, using original content");
    return pulse.content;
  }

  try {
    const postsContext = posts
      .map((post, index) => {
        return `Post ${index + 1}:
- Content: ${post.content}
- Views: ${post.views}
- Likes: ${post.likes}
- Retweets: ${post.retweets}
- Replies: ${post.replies}
${post.url ? `- URL: ${post.url}` : ""}
${post.author ? `- Author: ${post.author}` : ""}`;
      })
      .join("\n\n");

    const userPrompt =
      locale === "zh-CN"
        ? `话题：${pulse.title}\n\n以下是该话题浏览量最高的 ${posts.length} 条帖子：\n\n${postsContext}\n\n请根据这些帖子生成该热门话题的准确描述。`
        : `Topic: ${pulse.title}\n\nHere are the top ${posts.length} most viewed posts about this topic:\n\n${postsContext}\n\nGenerate an accurate description of this trending topic based on these posts.`;

    const result = await generateText({
      model: llm("gpt-5-mini"),
      system: generateDescriptionSystem({ locale }),
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
    return pulse.content;
  }
}
