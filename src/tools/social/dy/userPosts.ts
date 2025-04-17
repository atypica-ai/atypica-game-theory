import { PlainTextToolResult } from "@/tools/utils";
import { tool } from "ai";
import { z } from "zod";
import { SocialUser } from "../types";
import { tryFindValidImage } from "./utils";

interface DYUserPost {
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

export interface DYUserPostsResult extends PlainTextToolResult {
  posts: DYUserPost[];
  plainText: string;
}

function parseDYUserPosts(result: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aweme_list: any[];
}): DYUserPostsResult {
  const posts: DYUserPost[] = [];
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
  //
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

async function dyUserPosts({ secret_userid }: { secret_userid: string }) {
  for (let i = 0; i < 3; i++) {
    try {
      const headers = { Authorization: `Bearer ${process.env.BY_API_TOKEN!}` };
      const params = { sec_user_id: secret_userid, max_cursor: "0" };
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(
        `${process.env.BY_API_BASE_URL}/douyin/user/post/video/raw?${queryString}`,
        { headers },
      );
      const res = await response.json();
      console.log("Response text:", JSON.stringify(res).slice(0, 100));
      if (res.code === 0) {
        const result = parseDYUserPosts(res.result);
        return result;
      } else {
        console.log("Failed to fetch DY user posts, retrying...", i + 1);
        // 2005 错误是 超过所允许的访问间隔
        const seconds = res.code === 2005 ? Math.floor(Math.random() * 20) + 10 : 3;
        await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
        continue;
      }
    } catch (error) {
      console.log("Error fetching DY user posts:", error);
    }
  }
  return {
    posts: [],
    plainText: "Failed to fetch DY user posts after 3 retries",
  };
}

export const dyUserPostsTool = tool({
  description: "获取抖音特定用户的帖子，用于分析用户的特征和喜好",
  parameters: z.object({
    secret_userid: z.string().describe("The secret user ID to fetch posts from"),
  }),
  experimental_toToolResultContent: (result: PlainTextToolResult) => {
    return [{ type: "text", text: result.plainText }];
  },
  execute: async ({ secret_userid }) => {
    const result = await dyUserPosts({ secret_userid });
    return result;
  },
});
