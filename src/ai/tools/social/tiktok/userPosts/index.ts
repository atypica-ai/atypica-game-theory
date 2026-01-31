import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { rootLogger } from "@/lib/logging";
import { tool } from "ai";
import {
  TikTokUserPostsResult,
  tiktokUserPostsInputSchema,
  tiktokUserPostsOutputSchema,
} from "./types";

const toolLog = rootLogger.child({
  tool: "tiktokUserPosts",
});

function parseTikTokUserPosts(result: {
  data: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itemList: any[];
  };
}): TikTokUserPostsResult {
  const posts: TikTokUserPostsResult["posts"] = [];
  // 只取前十条
  const topUserPosts = (result?.data?.itemList ?? []).slice(0, 10);
  topUserPosts.forEach((item) => {
    posts.push({
      id: item.id,
      desc: item.desc,
      liked_count: item.stats?.diggCount,
      collected_count: item.stats?.collectCount,
      comments_count: item.stats?.commentCount,
      user: {
        nickname: item.author?.nickname,
        userid: item.author?.id,
        secret_userid: item.author?.secUid,
        image: item.author?.avatarMedium,
      },
      images_list: [{ url: item.video?.cover }],
    });
  });
  const plainText = JSON.stringify(
    posts.map((post) => ({
      postid: post.id,
      userid: post.user.userid,
      secret_userid: post.user.secret_userid,
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

async function tiktokUserPosts({ secret_userid }: { secret_userid: string }) {
  for (let i = 0; i < 3; i++) {
    try {
      const headers = { Authorization: `Bearer ${process.env.TIKHUB_API_TOKEN!}` };
      const params = { secUid: secret_userid, cursor: "0", count: "10" };
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(
        `${process.env.TIKHUB_API_BASE_URL}/tiktok/web/fetch_user_post?${queryString}`,
        { headers },
      );
      const res = await response.json();
      toolLog.info(`Response text: ${JSON.stringify(res).slice(0, 100)}`);
      if (res.code === 200) {
        const result = parseTikTokUserPosts(res);
        return result;
      } else {
        toolLog.warn(`Failed to fetch TikTok user posts, retrying... ${i + 1}`);
        await new Promise((resolve) => setTimeout(resolve, 3 * 1000));
        continue;
      }
    } catch (error) {
      toolLog.warn(`Error fetching TikTok user posts: ${(error as Error).message}`);
    }
  }
  return {
    posts: [],
    plainText: "Failed to fetch TikTok user posts after 3 retries",
  };
}

export const tiktokUserPostsTool = tool({
  description: "Fetch posts from specific TikTok user",
  inputSchema: tiktokUserPostsInputSchema,
  outputSchema: tiktokUserPostsOutputSchema,
  toModelOutput: (result: PlainTextToolResult) => {
    return { type: "text", value: result.plainText };
  },
  execute: async ({ secret_userid }): Promise<TikTokUserPostsResult> => {
    const result = await tiktokUserPosts({ secret_userid });
    return result;
  },
});
