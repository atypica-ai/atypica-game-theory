import { PlainTextToolResult } from "@/ai/tools";
import { rootLogger } from "@/lib/logging";
import { tool } from "ai";
import { z } from "zod";
import { SocialUser } from "../types";
import { tryFindValidImage } from "./utils";

const toolLog = rootLogger.child({
  tool: "tiktokUserPosts",
});

interface TikTokUserPost {
  id: string;
  desc: string;
  liked_count: number;
  collected_count: number;
  comments_count: number;
  user: SocialUser & {
    secret_userid: string;
  };
  images_list: {
    url: string;
  }[];
}

export interface TikTokUserPostsResult extends PlainTextToolResult {
  posts: TikTokUserPost[];
  plainText: string;
}

function parseTikTokUserPosts(result: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aweme_list: any[];
}): TikTokUserPostsResult {
  const posts: TikTokUserPost[] = [];
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
  description: "获取 TikTok 特定用户的帖子，用于分析用户的特征和喜好",
  parameters: z.object({
    secret_userid: z.string().describe("The secret user ID to fetch posts from"),
  }),
  experimental_toToolResultContent: (result: PlainTextToolResult) => {
    return [{ type: "text", text: result.plainText }];
  },
  execute: async ({ secret_userid }) => {
    const result = await tiktokUserPosts({ secret_userid });
    return result;
  },
});
