import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { rootLogger } from "@/lib/logging";
import { fixMalformedUnicodeString } from "@/lib/utils";
import { tool } from "ai";
import { z } from "zod";
import { tryFindValidImage } from "../utils";
import { DYPost, DYSearchResult } from "./types";

const toolLog = rootLogger.child({
  tool: "dySearch",
});

function parseDYSearchResult(result: {
  data: {
    type: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    aweme_info: any;
  }[];
}): DYSearchResult {
  const posts: DYPost[] = [];
  // 过滤并取前十条
  const topPosts = (result?.data ?? [])
    .filter((item) => item.type === 1) // 有 aweme_info
    .slice(0, 10);
  topPosts.forEach(({ aweme_info }) => {
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
  // 这个方法返回的结果会发给 LLM 用来生成回复，只需要把 LLM 能够使用的文本给它就行，节省很多 tokens
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function dySearchTikhub({ keyword }: { keyword: string }) {
  for (let i = 0; i < 3; i++) {
    try {
      const headers = { Authorization: `Bearer ${process.env.BY_API_TOKEN!}` };
      const params = { keyword };
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(
        `${process.env.BY_API_BASE_URL}/douyin/video/search/raw?${queryString}`,
        { headers },
      );
      const res = await response.json();
      toolLog.info(`Response text: ${JSON.stringify(res).slice(0, 100)}`);
      if (res.code === 0) {
        const result = parseDYSearchResult(res.result);
        return result;
      } else {
        toolLog.warn(`Failed to fetch DY posts, retrying... ${i + 1}`);
        // 2005 错误是 超过所允许的访问间隔
        const seconds = res.code === 2005 ? Math.floor(Math.random() * 20) + 10 : 3;
        await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
        continue;
      }
    } catch (error) {
      toolLog.warn(`Error fetching DY posts: ${(error as Error).message}`);
    }
  }
  return {
    posts: [],
    plainText: "Failed to fetch DY posts after 3 retries",
  };
}

async function dySearchSX({ keyword }: { keyword: string }) {
  for (let i = 0; i < 3; i++) {
    try {
      const params = {
        token: process.env.SX_API_TOKEN!,
        keyword,
        sortType: "_0",
        publishTime: "_0",
        duration: "_0",
        page: "1",
      };
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(
        `${process.env.SX_API_BASE_URL}/douyin/search-video/v4?${queryString}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: { code: number; data: any } = await response.json();
      toolLog.info(`Response text: ${JSON.stringify(data).slice(0, 100)}`);
      if (data.code === 0 && data.data) {
        const result = parseDYSearchResult({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: data.data.business_data?.map((item: any) => item.data),
        });
        return result;
      } else {
        toolLog.warn(`Failed to fetch DY posts, retrying... ${i + 1}`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        continue;
      }
    } catch (error) {
      toolLog.warn(`Error fetching DY posts: ${(error as Error).message}`);
    }
  }
  return {
    notes: [],
    plainText: "Failed to fetch DY posts after 3 retries",
  };
}

export const dySearchTool = tool({
  description: "在抖音上搜索内容，可以搜索特定的主题，也可以搜索一个品牌",
  parameters: z.object({
    keyword: z.string().describe("Search keywords").transform(fixMalformedUnicodeString),
  }),
  // 这个方法返回的结果会发给 LLM 用来生成回复，只需要把 LLM 能够使用的文本给它就行，节省很多 tokens
  experimental_toToolResultContent: (result: PlainTextToolResult) => {
    return [{ type: "text", text: result.plainText }];
  },
  execute: async ({ keyword }) => {
    // const result = await dySearchTikhub({ keyword });
    const result = await dySearchSX({ keyword });
    return result;
  },
});
