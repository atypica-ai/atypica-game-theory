import { rootLogger } from "@/lib/logging";
import { fixMalformedUnicodeString } from "@/lib/utils";
import { PlainTextToolResult } from "@/tools/utils";
import { tool } from "ai";
import { z } from "zod";
import { SocialUser } from "../types";

const toolLog = rootLogger.child({
  tool: "insSearch",
});

interface InsPost {
  id: string;
  code: string;
  desc: string;
  liked_count: number;
  comments_count: number;
  user: SocialUser;
  images_list: {
    url: string;
  }[];
}

export interface InsSearchResult extends PlainTextToolResult {
  posts: InsPost[];
  // total: number;
  plainText: string;
}

function parseinsSearchResult(result: {
  data: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: any[];
  };
}): InsSearchResult {
  const posts: InsPost[] = [];
  // 过滤并取前十条
  const topPosts = (result?.data.items ?? []).slice(0, 10);
  topPosts.forEach((item) => {
    posts.push({
      id: item.id,
      code: item.code,
      desc: item.caption?.text,
      liked_count: item.like_count,
      comments_count: item.comment_count,
      user: {
        nickname: item.user?.username,
        userid: item.user?.id,
        image: item.user?.profile_pic_url,
      },
      images_list: [{ url: item.thumbnail_url }],
    });
  });
  // 这个方法返回的结果会发给 LLM 用来生成回复，只需要把 LLM 能够使用的文本给它就行，节省很多 tokens
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

async function insSearch({ keyword }: { keyword: string }) {
  for (let i = 0; i < 3; i++) {
    try {
      const headers = { Authorization: `Bearer ${process.env.TIKHUB_API_TOKEN!}` };
      const params = { keyword };
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(
        `${process.env.TIKHUB_API_BASE_URL}/instagram/web_app/fetch_search_reels_by_keyword?${queryString}`,
        { headers },
      );
      const res = await response.json();
      toolLog.info(`Response text: ${JSON.stringify(res).slice(0, 100)}`);
      if (res.code === 200) {
        const result = parseinsSearchResult(res.data);
        return result;
      } else {
        toolLog.warn(`Failed to fetch Instagram feed, retrying... ${i + 1}`);
        await new Promise((resolve) => setTimeout(resolve, 3 * 1000));
        continue;
      }
    } catch (error) {
      toolLog.error(`Error fetching Instagram feed: ${(error as Error).message}`);
    }
  }
  return {
    posts: [],
    plainText: "Failed to fetch ins feed after 3 retries",
  };
}

export const insSearchTool = tool({
  description: "在 Instagram 上搜索内容，可以搜索特定的主题，也可以搜索一个品牌",
  parameters: z.object({
    keyword: z.string().describe("Search keywords").transform(fixMalformedUnicodeString),
  }),
  // 这个方法返回的结果会发给 LLM 用来生成回复，只需要把 LLM 能够使用的文本给它就行，节省很多 tokens
  experimental_toToolResultContent: (result: PlainTextToolResult) => {
    return [{ type: "text", text: result.plainText }];
  },
  execute: async ({ keyword }) => {
    const result = await insSearch({ keyword });
    return result;
  },
});
