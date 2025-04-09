import { PlainTextToolResult } from "@/tools/utils";
import { tool } from "ai";
import { z } from "zod";

interface DYPost {
  id: string;
  desc: string;
  liked_count: number;
  collected_count: number;
  comments_count: number;
  user: {
    nickname: string;
    userid: string;
    images: string;
  };
  images_list: {
    url: string;
    url_size_large: string;
    width: number;
    height: number;
  }[];
}

export interface DYSearchResult extends PlainTextToolResult {
  posts: DYPost[];
  // total: number;
  plainText: string;
}

function parseDYSearchResult(data: {
  data: {
    business_data: {
      data_id: string;
      type: number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { aweme_info: any };
    }[];
  };
}): DYSearchResult {
  const posts: DYPost[] = [];
  // 过滤并取前十条
  const topPosts = (data?.data?.business_data ?? [])
    .filter((item) => item.type === 1) // 有 aweme_info
    .slice(0, 10);
  topPosts.forEach(({ data: { aweme_info } }) => {
    posts.push({
      id: aweme_info.aweme_id,
      desc: aweme_info.desc,
      liked_count: aweme_info.statistics.digg_count,
      collected_count: aweme_info.statistics.collect_count,
      comments_count: aweme_info.statistics.comment_count,
      user: {
        nickname: aweme_info.author.nickname,
        userid: aweme_info.author.uid,
        images: aweme_info.author.avatar_medium.url_list[0],
      },
      images_list: aweme_info.video.cover.url_list.map((url: string) => ({
        url: url,
        url_size_large: url,
        width: aweme_info.video.cover.width,
        height: aweme_info.video.cover.height,
      })),
    });
  });
  // 这个方法返回的结果会发给 LLM 用来生成回复，只需要把 LLM 能够使用的文本给它就行，节省很多 tokens
  const plainText = JSON.stringify(
    posts.map((post) => ({
      postid: post.id,
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

async function dySearch({ keyword }: { keyword: string }) {
  for (let i = 0; i < 3; i++) {
    try {
      const params = {
        token: process.env.SOCIAL_API_TOKEN!,
        keyword,
        page: "1",
        sortType: "_0",
        publishTime: "_0",
        duration: "_0",
      };
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(
        `${process.env.SOCIAL_API_BASE_URL}/douyin/search-video/v4?${queryString}`,
      );
      const data = await response.json();
      console.log("Response text:", JSON.stringify(data).slice(0, 100));
      if (data.code === 0) {
        const result = parseDYSearchResult(data);
        return result;
      } else {
        console.log("Failed to fetch DY feed, retrying...", i + 1);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        continue;
      }
    } catch (error) {
      console.log("Error fetching DY feed:", error);
    }
  }
  return {
    posts: [],
    plainText: "Failed to fetch DY feed after 3 retries",
  };
}

export const dySearchTool = tool({
  description: "在抖音上搜索内容，可以搜索特定的主题，也可以搜索一个品牌",
  parameters: z.object({
    keyword: z.string().describe("Search keywords"),
  }),
  // 这个方法返回的结果会发给 LLM 用来生成回复，只需要把 LLM 能够使用的文本给它就行，节省很多 tokens
  experimental_toToolResultContent: (result: PlainTextToolResult) => {
    return [{ type: "text", text: result.plainText }];
  },
  execute: async ({ keyword }) => {
    const result = await dySearch({ keyword });
    return result;
  },
});
