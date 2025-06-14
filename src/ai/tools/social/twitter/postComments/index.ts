import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { rootLogger } from "@/lib/logging";
import { tool } from "ai";
import { z } from "zod";
import { TwitterPostCommentsResult } from "./types";

const toolLog = rootLogger.child({
  tool: "twitterPostComments",
});

function parseTwitterPostComments(result: {
  // id: number,
  // text: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  thread: any[];
}): TwitterPostCommentsResult {
  // 只取前十条
  const topComments = (result?.thread ?? []).slice(0, 10);
  const comments = topComments.map((item) => {
    return {
      id: item.id,
      content: item.text,
      user: {
        userid: item.author?.rest_id,
        nickname: item.author?.name,
        image: item.author?.image,
      },
      like_count: item.likes,
      sub_comment_count: item.replies,
    };
  });
  const plainText = JSON.stringify(
    comments.map((comment) => ({
      userid: comment.user.userid,
      nickname: comment.user.nickname,
      content: comment.content,
      like_count: comment.like_count,
      sub_comment_count: comment.sub_comment_count,
    })),
  );
  return {
    comments,
    plainText,
  };
}

async function twitterPostComments({ tweetid }: { tweetid: string }) {
  for (let i = 0; i < 3; i++) {
    try {
      const headers = { Authorization: `Bearer ${process.env.TIKHUB_API_TOKEN!}` };
      const params = { tweet_id: tweetid };
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(
        `${process.env.TIKHUB_API_BASE_URL}/twitter/web/fetch_post_comments?${queryString}`,
        { headers },
      );
      const res = await response.json();
      toolLog.info(`Response text: ${JSON.stringify(res).slice(0, 100)}`);
      if (res.code === 200) {
        const result = parseTwitterPostComments(res.data);
        return result;
      } else {
        toolLog.warn(`Failed to fetch Twitter post comments, retrying... ${i + 1}`);
        await new Promise((resolve) => setTimeout(resolve, 3 * 1000));
        continue;
      }
    } catch (error) {
      toolLog.warn(`Error fetching Twitter post comments: ${(error as Error).message}`);
    }
  }
  return {
    comments: [],
    plainText: "Failed to fetch Twitter post comments after 3 attempts",
  };
}

export const twitterPostCommentsTool = tool({
  description: "Fetch comments from specific Twitter post",
  parameters: z.object({
    tweetid: z.string().describe("The tweet ID to fetch comments from"),
  }),
  experimental_toToolResultContent: (result: PlainTextToolResult) => {
    return [{ type: "text", text: result.plainText }];
  },
  execute: async ({ tweetid }) => {
    const result = await twitterPostComments({ tweetid });
    return result;
  },
});
