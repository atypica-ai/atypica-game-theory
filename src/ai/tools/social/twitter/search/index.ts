import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { rootLogger } from "@/lib/logging";
import { tool } from "ai";
import { TwitterSearchResult, twitterSearchInputSchema, twitterSearchOutputSchema } from "./types";

const toolLog = rootLogger.child({
  tool: "twitterSearch",
});

function parseTwitterSearchResult(result: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  timeline: any[];
}): TwitterSearchResult {
  const posts: TwitterSearchResult["posts"] = [];
  // 过滤并取前十条
  const topPosts = (result?.timeline ?? [])
    .filter((item) => item.type === "tweet") //
    .slice(0, 10);
  topPosts.forEach((item) => {
    posts.push({
      id: item.tweet_id,
      desc: item.text,
      liked_count: item.favorites,
      comments_count: item.replies,
      collected_count: item.bookmarks,
      user: {
        nickname: item.user_info?.name,
        userid: item.user_info?.rest_id,
        image: item.user_info?.avatar,
      },
      images_list: [{ url: item.media?.photo?.[0]?.media_url_https }],
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

async function twitterSearch({ keyword }: { keyword: string }) {
  for (let i = 0; i < 3; i++) {
    try {
      const headers = { Authorization: `Bearer ${process.env.TIKHUB_API_TOKEN!}` };
      const params = { keyword, search_type: "top" };
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(
        `${process.env.TIKHUB_API_BASE_URL}/twitter/web/fetch_search_timeline?${queryString}`,
        { headers },
      );
      const res = await response.json();
      toolLog.info(`Response text: ${JSON.stringify(res).slice(0, 100)}`);
      if (res.code === 200) {
        const result = parseTwitterSearchResult(res.data);
        return result;
      } else {
        toolLog.warn(`Failed to fetch Twitter feed, retrying... ${i + 1}`);
        await new Promise((resolve) => setTimeout(resolve, 3 * 1000));
        continue;
      }
    } catch (error) {
      toolLog.warn(`Error fetching Twitter feed: ${(error as Error).message}`);
    }
  }
  return {
    posts: [],
    plainText: "Failed to fetch ins feed after 3 retries",
  };
}

export const twitterSearchTool = tool({
  description: "Search for content on Twitter, including specific topics or brands",
  inputSchema: twitterSearchInputSchema,
  outputSchema: twitterSearchOutputSchema,
  // 这个方法返回的结果会发给 LLM 用来生成回复，只需要把 LLM 能够使用的文本给它就行，节省很多 tokens
  toModelOutput: (result: PlainTextToolResult) => {
    return { type: "text", value: result.plainText };
  },
  execute: async ({ keyword }) => {
    const result = await twitterSearch({ keyword });
    return result;
  },
});
