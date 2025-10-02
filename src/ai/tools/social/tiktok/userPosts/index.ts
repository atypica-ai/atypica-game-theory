import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { rootLogger } from "@/lib/logging";
import { tool } from "ai";
import { tryFindValidImage } from "../utils";
import {
  TikTokUserPostsResult,
  tiktokUserPostsInputSchema,
  tiktokUserPostsOutputSchema,
} from "./types";

const toolLog = rootLogger.child({
  tool: "tiktokUserPosts",
});

function parseTikTokUserPosts(result: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aweme_list: any[];
}): TikTokUserPostsResult {
  const posts: TikTokUserPostsResult["posts"] = [];
  // 只取前十条
  const topUserPosts = (result?.aweme_list ?? []).slice(0, 10);
  topUserPosts.forEach((aweme_info) => {
    posts.push({
      id: aweme_info.aweme_id,
      desc: aweme_info.desc,
      liked_count: aweme_info.statistics?.digg_count,
      collected_count: aweme_info.statistics?.collect_count,
      comments_count: aweme_info.statistics?.comment_count,
      user: {
        nickname: aweme_info.author?.nickname,
        userid: aweme_info.author?.uid,
        secret_userid: aweme_info.author?.sec_uid,
        image: tryFindValidImage(aweme_info.author?.avatar_medium?.url_list),
      },
      images_list: [{ url: tryFindValidImage(aweme_info.video?.cover?.url_list) }],
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
      const params = { sec_user_id: secret_userid, max_cursor: "0", count: "10", sort_type: "0" };
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(
        `${process.env.TIKHUB_API_BASE_URL}/tiktok/app/v3/fetch_user_post_videos?${queryString}`,
        { headers },
      );
      const res = await response.json();
      toolLog.info(`Response text: ${JSON.stringify(res).slice(0, 100)}`);
      if (res.code === 200) {
        const result = parseTikTokUserPosts(res.data);
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
