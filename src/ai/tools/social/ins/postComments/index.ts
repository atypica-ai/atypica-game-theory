import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { rootLogger } from "@/lib/logging";
import { tool } from "ai";
import {
  InsPostCommentsResult,
  insPostCommentsInputSchema,
  insPostCommentsOutputSchema,
} from "./types";

const toolLog = rootLogger.child({
  tool: "insPostComments",
});

function parseInsPostComments(result: {
  data: {
    count: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: any[];
  };
}): InsPostCommentsResult {
  // 只取前十条
  const topComments = (result?.data?.items ?? []).slice(0, 10);
  const comments = topComments.map((item) => {
    return {
      id: item.id,
      content: item.text,
      user: {
        userid: item.user?.id,
        nickname: item.user?.username,
        image: item.user?.profile_pic_url,
      },
      like_count: item.comment_like_count,
      sub_comment_count: item.child_comment_count,
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

async function insPostComments({ postcode }: { postcode: string }) {
  for (let i = 0; i < 3; i++) {
    try {
      const headers = { Authorization: `Bearer ${process.env.TIKHUB_API_TOKEN!}` };
      const params = { url: `https://www.instagram.com/p/${postcode}/` };
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(
        `${process.env.TIKHUB_API_BASE_URL}/instagram/web_app/fetch_post_comments_by_url?${queryString}`,
        { headers },
      );
      const res = await response.json();
      toolLog.info(`Response text: ${JSON.stringify(res).slice(0, 100)}`);
      if (res.code === 200) {
        const result = parseInsPostComments(res.data);
        return result;
      } else {
        toolLog.warn(`Failed to fetch Instagram post comments, retrying... ${i + 1}`);
        // 2005 错误是 超过所允许的访问间隔
        await new Promise((resolve) => setTimeout(resolve, 3 * 1000));
        continue;
      }
    } catch (error) {
      toolLog.warn(`Error fetching Instagram post comments: ${(error as Error).message}`);
    }
  }
  return {
    comments: [],
    plainText: "Failed to fetch Instagram post comments after 3 attempts",
  };
}

export const insPostCommentsTool = tool({
  description: "Fetch comments from specific Instagram post",
  inputSchema: insPostCommentsInputSchema,
  outputSchema: insPostCommentsOutputSchema,
  toModelOutput: (result: PlainTextToolResult) => {
    return { type: "text", value: result.plainText };
  },
  execute: async ({ postcode }) => {
    const result = await insPostComments({ postcode });
    return result;
  },
});
