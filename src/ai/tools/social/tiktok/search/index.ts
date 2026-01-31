import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { rootLogger } from "@/lib/logging";
import { tool } from "ai";
import { TikTokSearchResult, tiktokSearchInputSchema, tiktokSearchOutputSchema } from "./types";

const toolLog = rootLogger.child({
  tool: "tiktokSearch",
});

function parseTikTokSearchResult(result: {
  data: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    item_list: any[];
  };
}): TikTokSearchResult {
  const posts: TikTokSearchResult["posts"] = [];
  // 取前十条
  const topPosts = (result?.data?.item_list ?? []).slice(0, 10);
  topPosts.forEach((item) => {
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

async function tiktokSearch({ keyword }: { keyword: string }) {
  for (let i = 0; i < 3; i++) {
    try {
      const headers = { Authorization: `Bearer ${process.env.TIKHUB_API_TOKEN!}` };
      const params = { keyword, offset: "0", count: "10" };
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(
        `${process.env.TIKHUB_API_BASE_URL}/tiktok/web/fetch_search_video?${queryString}`,
        { headers },
      );
      const res = await response.json();
      toolLog.info(`Response text: ${JSON.stringify(res).slice(0, 100)}`);
      if (res.code === 200) {
        const result = parseTikTokSearchResult(res);
        return result;
      } else {
        toolLog.warn(`Failed to fetch TikTok feed, retrying... ${i + 1}`);
        await new Promise((resolve) => setTimeout(resolve, 3 * 1000));
        continue;
      }
    } catch (error) {
      toolLog.warn(`Error fetching TikTok feed: ${(error as Error).message}`);
    }
  }
  return {
    posts: [],
    plainText: "Failed to fetch TikTok feed after 3 retries",
  };
}

export const tiktokSearchTool = tool({
  description: "Search for content on TikTok, including specific topics or brands",
  inputSchema: tiktokSearchInputSchema,
  outputSchema: tiktokSearchOutputSchema,
  // 这个方法返回的结果会发给 LLM 用来生成回复，只需要把 LLM 能够使用的文本给它就行，节省很多 tokens
  toModelOutput: (result: PlainTextToolResult) => {
    return { type: "text", value: result.plainText };
  },
  execute: async ({ keyword }) => {
    const result = await tiktokSearch({ keyword });
    return result;
  },
});
