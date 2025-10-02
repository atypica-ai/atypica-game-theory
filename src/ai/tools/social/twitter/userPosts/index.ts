import "server-only";

import { PlainTextToolResult, SocialPost } from "@/ai/tools/types";
import { rootLogger } from "@/lib/logging";
import { tool } from "ai";
import { z } from "zod/v3";
import { TwitterUserPostsResult } from "./types";

const toolLog = rootLogger.child({
  tool: "twitterUserPosts",
});

function parseTwitterUserPosts(result: {
  // pinned: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  timeline: any[];
}): TwitterUserPostsResult {
  const posts: SocialPost[] = [];
  // 只取前十条
  const topUserPosts = (result?.timeline ?? []).slice(0, 10);
  topUserPosts.forEach((item) => {
    posts.push({
      id: item.tweet_id,
      desc: item.text,
      liked_count: item.favorites,
      comments_count: item.replies,
      collected_count: item.bookmarks,
      user: {
        nickname: item.author?.name,
        userid: item.author?.rest_id,
        image: item.author?.avatar,
      },
      images_list: [{ url: item.thumbnail_url }],
    });
  });
  const plainText = JSON.stringify(
    posts.map((post) => ({
      tweetid: post.id,
      userid: post.user.userid,
      nickname: post.user.nickname,
      desc: post.desc,
      comments_count: post.comments_count,
    })),
  );
  return {
    posts,
    plainText,
  };
}

async function twitterUserPosts({ userid }: { userid: string }) {
  for (let i = 0; i < 3; i++) {
    try {
      const headers = { Authorization: `Bearer ${process.env.TIKHUB_API_TOKEN!}` };
      const params = { rest_id: userid };
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(
        `${process.env.TIKHUB_API_BASE_URL}/twitter/web/fetch_user_post_tweet?${queryString}`,
        { headers },
      );
      const res = await response.json();
      toolLog.info(`Response text: ${JSON.stringify(res).slice(0, 100)}`);
      if (res.code === 200) {
        const result = parseTwitterUserPosts(res.data);
        return result;
      } else {
        toolLog.warn(`Failed to fetch Twitter user posts, retrying... ${i + 1}`);
        await new Promise((resolve) => setTimeout(resolve, 3 * 1000));
        continue;
      }
    } catch (error) {
      toolLog.warn(`Error fetching Twitter user posts: ${(error as Error).message}`);
    }
  }
  return {
    posts: [],
    plainText: "Failed to fetch Twitter user posts after 3 retries",
  };
}

export const twitterUserPostsTool = tool({
  description: "Fetch posts from specific Twitter user",
  inputSchema: z.object({
    userid: z.string().describe("The user ID to fetch posts from"),
  }),
  experimental_toToolResultContent: (result: PlainTextToolResult) => {
    return [{ type: "text", text: result.plainText }];
  },
  execute: async ({ userid }) => {
    const result = await twitterUserPosts({ userid });
    return result;
  },
});
