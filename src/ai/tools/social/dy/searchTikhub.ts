import "server-only";

// tikhub douyin 搜索接口是 $0.01 太贵了
import { PlainTextToolResult, SocialUser } from "@/ai/tools/types";
import { rootLogger } from "@/lib/logging";
import { fixMalformedUnicodeString } from "@/lib/utils";
import { tool } from "ai";
import { z } from "zod";
import { tryFindValidImage } from "../utils";

const toolLog = rootLogger.child({
  tool: "dySearch",
});

interface DYPost {
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

export interface DYSearchResult extends PlainTextToolResult {
  posts: DYPost[];
  // total: number;
  plainText: string;
}

function parseDYSearchResult(result: {
  business_data: {
    data: {
      type: number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      aweme_info: any;
    };
  }[];
}): DYSearchResult {
  const posts: DYPost[] = [];
  // 过滤并取前十条
  const topPosts = (result?.business_data ?? [])
    .filter(({ data }) => data?.type === 1) // 有 aweme_info
    .slice(0, 10);
  topPosts.forEach(({ data: { aweme_info } }) => {
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

async function dySearch({ keyword }: { keyword: string }) {
  for (let i = 0; i < 3; i++) {
    try {
      const headers = { Authorization: `Bearer ${process.env.TIKHUB_API_TOKEN!}` };
      const payload = {
        keyword,
        cursor: 0,
        sort_type: "0",
        publish_time: "0",
        filter_duration: "0",
        content_type: "0",
        search_id: "",
      };
      const response = await fetch(
        `${process.env.TIKHUB_API_BASE_URL}/douyin/search/fetch_video_search_v2`,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      const res = await response.json();
      toolLog.info(`Response text: ${JSON.stringify(res).slice(0, 100)}`);
      if (res.code === 200) {
        const result = parseDYSearchResult(res.data);
        return result;
      } else {
        toolLog.warn(`Failed to fetch DY feed, retrying... ${i + 1}`);
        await new Promise((resolve) => setTimeout(resolve, 3 * 1000));
        continue;
      }
    } catch (error) {
      toolLog.warn(`Error fetching DY feed: ${(error as Error).message}`);
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
    keyword: z.string().describe("Search keywords").transform(fixMalformedUnicodeString),
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
