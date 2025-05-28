import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { rootLogger } from "@/lib/logging";
import { tool } from "ai";
import { z } from "zod";
import { InsUserPost, InsUserPostsResult } from "./types";

const toolLog = rootLogger.child({
  tool: "insUserPosts",
});

function parseInsUserPosts(result: {
  data: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: any[];
  };
}): InsUserPostsResult {
  const posts: InsUserPost[] = [];
  // 只取前十条
  const topUserPosts = (result?.data.items ?? []).slice(0, 10);
  topUserPosts.forEach((item) => {
    posts.push({
      id: item.id,
      code: item.code,
      desc: item.caption?.text,
      liked_count: item.like_count,
      comments_count: item.comment_count,
      collected_count: 0, // instagram 没有这个字段
      user: {
        nickname: item.user?.username,
        userid: item.user?.id,
        image: item.user?.profile_pic_url,
      },
      images_list: [{ url: item.thumbnail_url }],
    });
  });
  //
  const plainText = JSON.stringify(
    posts.map((post) => ({
      postid: post.id,
      postcode: post.code,
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

async function insUserPosts({ userid }: { userid: string }) {
  for (let i = 0; i < 3; i++) {
    try {
      const headers = { Authorization: `Bearer ${process.env.TIKHUB_API_TOKEN!}` };
      const params = { user_id: userid };
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(
        `${process.env.TIKHUB_API_BASE_URL}/instagram/web_app/fetch_user_posts_and_reels_by_user_id?${queryString}`,
        { headers },
      );
      const res = await response.json();
      toolLog.info(`Response text: ${JSON.stringify(res).slice(0, 100)}`);
      if (res.code === 200) {
        const result = parseInsUserPosts(res.data);
        return result;
      } else {
        toolLog.warn(`Failed to fetch Instagram user posts, retrying... ${i + 1}`);
        // 2005 错误是 超过所允许的访问间隔
        await new Promise((resolve) => setTimeout(resolve, 3 * 1000));
        continue;
      }
    } catch (error) {
      toolLog.warn(`Error fetching Instagram user posts: ${(error as Error).message}`);
    }
  }
  return {
    posts: [],
    plainText: "Failed to fetch Instagram user posts after 3 retries",
  };
}

export const insUserPostsTool = tool({
  description: "Fetch posts from specific Instagram user",
  parameters: z.object({
    userid: z.string().describe("The user ID to fetch posts from"),
  }),
  experimental_toToolResultContent: (result: PlainTextToolResult) => {
    return [{ type: "text", text: result.plainText }];
  },
  execute: async ({ userid }) => {
    const result = await insUserPosts({ userid });
    return result;
  },
});
